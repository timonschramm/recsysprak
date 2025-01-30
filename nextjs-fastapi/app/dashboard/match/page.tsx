'use client';
import { AnimatePresence } from 'framer-motion';
import { Profile } from '@prisma/client';
import { useEffect, useState } from 'react';
import { UserCard } from '@/app/components/UserCard';
import { ProfileWithArtistsAndInterestsAndSkills } from '@/types/profiles';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Match() {
  const [profiles, setProfiles] = useState<ProfileWithArtistsAndInterestsAndSkills[]>([]);
  const [rightSwipe, setRightSwipe] = useState(0);
  const [leftSwipe, setLeftSwipe] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) {
          throw new Error('Failed to fetch current user');
        }
        const data = await response.json();
        setCurrentUser(data);
      // console.log('currentUser:', currentUser);
      // console.log('data:', data);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    const fetchProfiles = async () => {
      try {
        const response = await fetch('/api/userRecs');
        if (!response.ok) {
          throw new Error('Failed to fetch profiles');
        }
        const data = await response.json();
        setProfiles(data);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
    fetchProfiles();
  }, []);



  const activeIndex = profiles.length - 1;
  
  const removeCard = (id: string, action: 'right' | 'left') => {
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
    if (action === 'right') {
      setRightSwipe((prev) => prev + 1);
    } else {
      setLeftSwipe((prev) => prev + 1);
    }
  };

  return (
    <div className="relative flex sm:h-[100vh] h-[calc(100vh-5rem)] w-full items-center justify-center overflow-hidden bg-background dark:bg-primary text-primary dark:text-primary-white">
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes rippleBackground {
          0% {
            background: radial-gradient(circle, rgba(255,68,88,0.1) 0%, rgba(255,68,88,0.05) 50%, transparent 70%);
            transform: scale(1);image.png
          }
          100% {
            background: radial-gradient(circle, rgba(255,68,88,0) 0%, rgba(255,68,88,0) 100%);
            transform: scale(2.5);
          }
        }
        .ripple-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .ripple-container {
          position: relative;
          width: 128px;
          height: 128px;
          background: rgb(255,68,88);
          border-radius: 50%;
        }
        .ripple-circle {
          position: absolute;
          inset: -2px;
          border: 2px solid rgba(255,68,88,0.3);
          border-radius: 50%;
          background: rgba(255,68,88, 0.3);
        }
        .ripple-circle:nth-child(1) {
          animation: ripple 2s linear infinite;
        }
        .ripple-circle:nth-child(2) {
          animation: ripple 2s linear infinite 1s;
        }
      `}</style>
      <div className="absolute inset-0 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="ripple-wrapper">
                <div className="ripple-container">
                  <div className="ripple-circle" />
                  <div className="ripple-circle" />
                </div>
              </div>
              <Avatar className="w-32 h-32 border-4 border-white relative z-20">
                <AvatarImage
                  src={currentUser?.imageUrl || ''}
                  alt="Your profile"
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {currentUser?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {profiles.length ? (
              profiles.map((profile, index) => (
                index === activeIndex && (
                  <UserCard
                    key={profile.id}
                    data={profile}
                    active={true}
                    removeCard={removeCard}
                    displayMode="stack"
                  />
                )
              ))
            ) : (
              <h2 className="text-center text-2xl font-bold text-primary dark:text-primary-white">
                No more profiles available!
                <br />
                Come back later for more
              </h2>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}