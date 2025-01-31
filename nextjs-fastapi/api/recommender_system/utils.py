import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from collections import Counter

load_dotenv(".env.local")


def get_user_skill_embedding(user_id: str):
    """
    Fetches the database for the user and returns an embedding of the user's hikingskills

    Parameters:
    - user_id: ID of the user

    Returns:
    - numpy Array: Array of the embedding
    """

    url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)

    response = supabase.table("UserSkill").select("SkillLevel(numericValue, name)").eq("profileId", user_id).neq(
        "SkillLevel.name", "CAR").neq("SkillLevel.name", "PUBLIC_TRANSPORT").neq("SkillLevel.name",
                                                                                      "BOTH").execute().data
    
    skills = [item['SkillLevel']['numericValue'] for item in response if item['SkillLevel'] is not None]
    return np.array(skills)


def get_user_direct_interest_embedding(user_id: int):
    """
    Fetches the database for the user and returns an embedding of the user's interests

    Parameters:
    - user_id: ID of the user

    Returns:
    - numpy Array: Array of the embedding
    """
    url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)

    response = supabase.table("UserInterest").select("interestId").eq("profileId", user_id).execute().data
    user_interests = [item["interestId"] for item in response]
    response = supabase.table("Interest").select("id").execute().data
    all_interests = [item["id"] for item in response]

    interest_embedding = np.array([1 if interest in user_interests else 0 for interest in all_interests], dtype=float)

    return interest_embedding


def get_user_indirect_interest_embedding(user_id: int):
    """
    Fetches the database for the user and returns an embedding of the user's interest groups

    Parameters:
    - user_id: ID of the user

    Returns:
    - numpy Array: Array of the embedding
    """
    url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)

    response = supabase.from_("UserInterest").select("Interest(category)").eq("profileId", user_id).execute().data
    categories_response = supabase.from_("Interest").select("category").execute().data

    categories_in_user_interests = [interest['Interest']['category'] for interest in response]
    category_count = Counter(categories_in_user_interests)
    categories = sorted(list(set([category['category'] for category in categories_response])))
    result = [category_count[category] for category in categories]

    interest_embedding = np.array(result)
    return interest_embedding


def calc_skill_similarity(user_id_a: int, user_id_b: int):
    """
    Calculates the skill similarity between two users

    Parameters:
    - user_id_a: ID of the first user
    - user_id_b: ID of the second user

    Returns:
    - float: Skill similarity between the two users
    """

    user_a_skill_embedding = get_user_skill_embedding(user_id_a).reshape(1, -1)
    user_b_skill_embedding = get_user_skill_embedding(user_id_b).reshape(1, -1)

    try:
        return cosine_similarity_numpy(user_a_skill_embedding, user_b_skill_embedding)[0][0]
    except Exception:
        return 0


def calc_interest_similarity(user_id_a: int, user_id_b: int):
    """
    Calculates the interest similarity between two users

    Parameters:
    - user_id_a: ID of the first user
    - user_id_b: ID of the second user

    Returns:
    - float: Interest similarity between the two users
    """
    user_a_direct_interest_embedding = get_user_direct_interest_embedding(user_id_a).reshape(1, -1)
    user_b_direct_interest_embedding = get_user_direct_interest_embedding(user_id_b).reshape(1, -1)
    direct_interest_sim = \
    cosine_similarity_numpy(user_a_direct_interest_embedding, user_b_direct_interest_embedding)[0][0]

    user_a_indirect_interest_embedding = get_user_indirect_interest_embedding(user_id_a).reshape(1, -1)
    user_b_indirect_interest_embedding = get_user_indirect_interest_embedding(user_id_b).reshape(1, -1)
    indirect_interest_sim = \
    cosine_similarity_numpy(user_a_indirect_interest_embedding, user_b_indirect_interest_embedding)[0][0]

    return 0.33 * direct_interest_sim + 0.67 * indirect_interest_sim


def cosine_similarity_numpy(vec1, vec2):
    # Flatten if 2D (assumes shape (1, N))
    vec1, vec2 = vec1.flatten(), vec2.flatten()

    # Handle empty vectors (return similarity of 0)
    if vec1.size == 0 or vec2.size == 0:
        return np.array([[0.0]])  # Ensure 2D array return

    # Compute dot product and norms
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)

    # Handle division by zero
    similarity = dot_product / (norm_vec1 * norm_vec2) if norm_vec1 * norm_vec2 != 0 else 0.0

    return np.array([[similarity]])  # Ensure a 2D array return


def calc_overall_similarity(user_id_a: int, user_id_b: int):
    """
    Calculates the overall similarity between two users.

    Parameters:
    - user_id_a: ID of the first user
    - user_id_b: ID of the second user

    Returns:
    - float: Overall similarity between the two users
    """
    return (0.66 * calc_skill_similarity(user_id_a, user_id_b)
            + 0.34 * calc_interest_similarity(user_id_a, user_id_b))  # TODO: Discuss weights


def fast_cosine_sim(reference_vector: np.array, other_vectors: np.array):
    """
    Computes cosine similarity between a reference vector and multiple other vectors using matrix operations.
    
    Parameters:
    - reference_vector: 1D Array for comparison
    - other_vectors: 2D array where each row is a vector

    Returns:
    - np.ndarray: Cosine similarity scores.
    
    """
    dot_products = other_vectors @ reference_vector
    norms = np.linalg.norm(other_vectors, axis=1) * np.linalg.norm(reference_vector) 
    return dot_products / norms  # TODO: not check for 0


def get_comp_skill_embeddings(comp_ids: list[str]):

    skill_embeddings = np.empty(shape=(0,3))

    for id in comp_ids:
        user_skill = get_user_skill_embedding(id)
        user_skill_padded = np.pad(user_skill, (0, max(0, 3 - user_skill.shape[0])), mode='constant', constant_values=-1)
        skill_embeddings = np.vstack([skill_embeddings, user_skill_padded])

    return np.array(skill_embeddings)

def get_comp_direct_interest_embeddings(comp_ids: list[str]):
    
    direct_interest_embeddings = np.empty(shape=(0,25))

    for id in comp_ids:
        user_interest = get_user_direct_interest_embedding(id)
        if np.sum(user_interest, axis=0) == 0:
            user_interest[0] = -1
        direct_interest_embeddings = np.vstack([direct_interest_embeddings, user_interest])

    return np.array(direct_interest_embeddings)

def get_comp_indirect_interest_embeddings(comp_ids: list[str]):

    indirect_interest_embeddings = np.empty(shape=(0,5))

    for id in comp_ids:
        user_interest = get_user_indirect_interest_embedding(id)
        if np.sum(user_interest, axis=0) == 0:
            user_interest[0] = -1
        indirect_interest_embeddings = np.vstack([indirect_interest_embeddings, user_interest])
    
    return np.array(indirect_interest_embeddings)


def get_recommendations(user_id: str):
    """
    Calculates a list of recommendations for the user based on skill, interests and given hike description

    Parameters:
    - user_id: ID of the user
    - hike_desc: Description of the hike

    Returns:
    - list of int: IDs of recommended users
    """

    url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)

    response = supabase.from_("Profile").select("id").neq("id", user_id).execute().data
    all_ids = [item["id"] for item in response]

    response = supabase.from_("UserSwipe").select("receiverId").eq("senderId", user_id).execute().data
    swiped_users = [item["receiverId"] for item in response]
    ids = [id for id in all_ids if id not in swiped_users]

    user_skill_embedding = get_user_skill_embedding(user_id)
    user_direct_interest_embedding = get_user_direct_interest_embedding(user_id)
    user_indirect_interest_embedding = get_user_indirect_interest_embedding(user_id)


    comp_skill_embeddings = get_comp_skill_embeddings(ids)
    comp_direct_interest_embeddings = get_comp_direct_interest_embeddings(ids)
    comp_indirect_interest_embeddings = get_comp_indirect_interest_embeddings(ids)

    skill_sim = fast_cosine_sim(user_skill_embedding, comp_skill_embeddings)
    direct_interest_sim = fast_cosine_sim(user_direct_interest_embedding, comp_direct_interest_embeddings)
    indirect_interest_sim = fast_cosine_sim(user_indirect_interest_embedding, comp_indirect_interest_embeddings)

    overall_sim = 0.67 * skill_sim + 0.11 * direct_interest_sim + 0.22 * indirect_interest_sim
    

    sorted_indices = np.argsort(overall_sim)[::-1]

    sorted_user_ids = np.array(ids)[sorted_indices].tolist()
    
    return sorted_user_ids[:10]
    
 
    





#get_recommendations("ce761f47-1e5f-453d-a829-d0ca925a5ca6")