import json
from .chatbot import Chatbot
from . import getHike
from . import finalRecommender
from .weather import get_weather
import re  # Add this import
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Initialize chatbot
chatbot = Chatbot()

def chatbot_loop_api(user_input, user_id, is_group_chat=False):
    """
    Main API wrapper for chatbot interactions with user-specific memory.
    Updated to handle the new 'weather' intent and group chat context.
    """
    if not user_input:
        return {"error": "No input provided"}

    # Categorize user intent
    intent = chatbot.categorize_intent(user_input, user_id)

    if intent == "other":
        return handle_general_chat(user_input, user_id)

    if intent == "general_chat":
        return handle_general_chat(user_input, user_id)
    elif intent == "hike_recommendation" or intent == "adjust_filters":
        return handle_hike_recommendation(user_input, user_id, is_group_chat)
    elif intent == "clarification":
        return handle_clarification(user_input, user_id)
    elif intent == "weather":
        return handle_weather(user_input, user_id)
    else:
        return {"response": "🤖 Sorry, I didn't understand that."}

def handle_general_chat(user_input, user_id):
    """
    Handles general conversation with the chatbot for a specific user.
    """
    general_prompt = chatbot._build_system_prompt("default", user_input)
    response = chatbot._call_gpt(user_input, general_prompt, user_id)
    return {"response": response}

def extract_keywords(user_input):
    """
    Extract important keywords from the user input that should be included in `description_match`.
    """
    # Define a list of common hiking-related keywords
    hiking_keywords = ["waterfalls", "mountains", "forest", "easy", "challenging", "scenic", "rocky", "snowy", "lake",
                       "river"]

    # Use regex to find all matching keywords in the user input
    keywords = []
    for keyword in hiking_keywords:
        if re.search(rf"\b{keyword}\b", user_input, re.IGNORECASE):
            keywords.append(keyword)

    return keywords

def handle_hike_recommendation(user_input, user_id, is_group_chat=False):
    """
    Handles hike recommendations dynamically and prioritizes matches across all text fields for a specific user.
    Supports general filter adjustments (e.g., removing waterfalls, snowy terrain, etc.).
    Always returns the full list of active filters after adjustments.
    """
    memory = chatbot.get_session_memory(user_id)
    user_filters = memory["conversation_state"]["user_filters"]

    try:
        # Ensure list-based filters are initialized as empty lists
        list_based_filters = ["scenery", "terrain", "description_match", "facilities"]
        for key in list_based_filters:
            if key not in user_filters or user_filters[key] is None:
                user_filters[key] = []

        # Ensure numerical filters are initialized with default values
        numerical_filters = {
            "max_length": 15000,  # Default max length in meters
            "min_length": 0,  # Default min length in meters
            "min_altitude": 0,  # Default min altitude in meters
            "max_altitude": 10000,  # Default max altitude in meters
        }
        for key, default_value in numerical_filters.items():
            if key not in user_filters or user_filters[key] is None:
                user_filters[key] = default_value

        # Extract new filters dynamically
        system_prompt = chatbot._build_system_prompt("recommendation", user_input)
        gpt_response = chatbot._call_gpt(user_input, system_prompt, user_id)

        try:
            new_filters = json.loads(gpt_response)

            # **Fallback: Manually extract keywords and append to `description_match`**
            extracted_keywords = extract_keywords(user_input)
            if "description_match" not in new_filters:
                new_filters["description_match"] = []
            new_filters["description_match"] = list(set(new_filters["description_match"] + extracted_keywords))

            # Merge new filters with existing ones
            for key, value in new_filters.items():
                if key in list_based_filters and isinstance(value, list):
                    # Append new values to existing lists
                    user_filters[key] = list(set(user_filters[key] + value))
                else:
                    # Update other filters
                    user_filters[key] = value

        except json.JSONDecodeError:
            print(f"❌ GPT Response was not valid JSON: {gpt_response}")
            return {"response": "I couldn't process your request. Could you provide more details?"}

        # Fetch recommendations
        recommendations_df = getHike.getHike(user_filters)

        if not recommendations_df.empty:
            # Ensure all text fields exist and fill missing values
            text_fields = ["title", "teaserText", "descriptionShort", "descriptionLong"]
            for field in text_fields:
                if field not in recommendations_df.columns:
                    recommendations_df[field] = ""

            # Sort recommendations by final_score
            recommendations_df = recommendations_df.sort_values(by="final_score", ascending=False).reset_index(
                drop=True)

            # Debugging output
            print("Sorted Recommendations Sent to Frontend:\n",
                  recommendations_df[["id", "title", "final_score"]].head())

            # Convert to dict for frontend
            recommendations = recommendations_df.to_dict(orient="records")

            # Store the last 5 recommended hikes in memory
            memory["last_recommended_hikes"] = recommendations[-5:]  # Keep only the last 5 hikes

            # Check if the chatbot is being used in a group chat context
            if is_group_chat:
                # Reset filters after recommendation
                memory["conversation_state"]["user_filters"] = {}
                chatbot.clear_session_memory(user_id)

            return {
                "response": "Here are some hikes you might like.",
                "hikes": recommendations,
                "filters": user_filters  # Include full filter list
            }

        # No results found: Provide alternatives
        else:
            alternative_filters = {
                "difficulty": user_filters.get("difficulty", 2),  # Default to medium
                "length": user_filters.get("max_length", 10000),  # Default max length
            }
            return {
                "response": "No hikes matched your filters. Filters like difficulty or keywords might have been too restrictive.",
                "alternatives": alternative_filters,
                "filters": user_filters  # Include full filter list
            }

    except Exception as e:
        print(f"❌ Error in handle_hike_recommendation: {e}")
        return {
            "response": "An error occurred while processing your request. Please try again later.",
            "filters": user_filters  # Include full filter list in error case
        }

def handle_clarification(user_input, user_id):
    """
    Handles clarification requests dynamically for a specific user.
    If the user asks about the last 5 hikes recommended, send the hike info and user query to ChatGPT.
    ChatGPT will determine if the query pertains to one of the hikes and respond accordingly.
    """
    memory = chatbot.get_session_memory(user_id)

    # Retrieve the last 5 hikes from memory
    last_hikes = memory.get("last_recommended_hikes", [])

    if not last_hikes:
        return {"response": "Hi either you have not yet asked for any recommendations or you are in a groupchat. Asking information about already recommended hikes is currently only supported under the HykingAI tab. Sorry for the inconvenience."}

    # Check if the user is asking about the last 5 hikes
    if True==True:
        # Prepare the system prompt for ChatGPT
        system_prompt = f"""
        You are a helpful hiking assistant. The user has asked a question about one of the last 5 hikes they were recommended.
        Here is the information about the last 5 hikes:
        {json.dumps(last_hikes, indent=2)}

        The user's query is: "{user_input}"

        Your task is to:
        1. Determine if the user's query pertains to one of the hikes.
        2. If it does, provide a detailed answer about that hike.
        3. If it doesn't pertain to any specific hike, provide an answer for each of the 5 hikes.
        4. If the query could apply to multiple hikes, provide an answer for each relevant hike.

        Respond in a friendly and helpful tone.
        """

        # Call ChatGPT with the system prompt and user input
        response = chatbot._call_gpt(user_input, system_prompt, user_id)

        return {"response": response}

    # Existing clarification logic for missing filters
    user_filters = memory["conversation_state"].get("user_filters", {})



    # If no missing filters, treat it as general chat
    general_prompt = chatbot._build_system_prompt("default", user_input)
    response = chatbot._call_gpt(user_input, general_prompt, user_id)
    return {"response": response}

def handle_weather(user_input, user_id):
    """
    Handles weather-related queries by fetching weather data from OpenWeatherMap API.
    Uses ChatGPT to extract the city name from the user's input.
    """
    try:
        # Use ChatGPT to extract the city name from the user's input
        system_prompt = """
        Extract the city name from the user's input. 
        Respond ONLY with the city name. If no city is mentioned, respond with "unknown".
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ]

        # Call ChatGPT to extract the city name
        location=chatbot._call_gpt(user_input, system_prompt, user_id)

        # Validate the extracted location
        if location.lower() == "unknown" or not location:
            return {"response": "Please specify a location for the weather."}

        # Fetch weather data
        weather_data = get_weather(location)
        return {
            "response": f"Weather in {location}: {weather_data['weather'][0]['description']}, Temperature: {weather_data['main']['temp']}°C",
            "weather": weather_data  # Include full weather data for the frontend
        }
    except Exception as e:
        print(f"❌ Error in handle_weather: {e}")
        return {"response": "Sorry, I couldn't fetch the weather data. Please try again later."}