import { UserCardProps } from '@/types/UserCardProps';
import {
  easeIn,
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';
import { useState, useCallback, forwardRef } from 'react';
import { Check, X, Music, MapPin } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { UserArtistWithArtist } from '@/types/Artists';
import { UserInterestWithInterest } from '@/types/Interest';
import UserArtistDisplay from './UserArtistDisplay';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import Modal from 'react-modal';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Bind modal to your appElement for accessibility
if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

const customModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    position: 'relative' as const,
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    maxWidth: '95vw',
    width: '400px',
    padding: 0,
    border: 'none',
    background: 'white',
    overflow: 'visible'
  }
};

const UserCardSkeleton = () => {
  return (
    <div className="absolute flex flex-col items-center justify-center">
      <div className="card-image-wrapper card relative z-30 h-[70vh] w-[90vw] md:h-[438px] md:w-[289px]  ">
        <div className="no-scrollbar rounded-2xl relative h-full w-full overflow-hidden bg-background-white ">
          <Skeleton className="absolute inset-0 bg-gray-200" />

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4">
            <Skeleton className="h-7 w-3/4 bg-gray-200/80 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24 bg-gray-200/80" />
              <div className="text-gray-200/80">•</div>
              <Skeleton className="h-4 w-16 bg-gray-200/80" />
              <div className="text-gray-200/80">•</div>
              <Skeleton className="h-4 w-20 bg-gray-200/80" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 z-40 flex gap-8">
        <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
        <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
      </div>
    </div>
  );
};

const UserCard = forwardRef<HTMLDivElement, UserCardProps>(function UserCard({
  data,
  active,
  removeCard,
  disableActions = false,
  displayMode = 'stack'
}, ref) {
  const [exitX, setExitX] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const dragThreshold = 10;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -125, 0, 125, 200], [0, 1, 1, 1, 0]);

  const leftIndicatorOpacity = useTransform(
    x,
    [-150, -25, 0],
    [1, 0.5, 0]
  );
  const rightIndicatorOpacity = useTransform(
    x,
    [0, 25, 150],
    [0, 0.5, 1]
  );
  const indicatorScale = useTransform(
    x,
    [-150, -100, 0, 100, 150],
    [1, 0.8, 0.5, 0.8, 1]
  );

  const leftIndicatorX = useTransform(
    x,
    [-200, -150, -100, -50, 0],
    [100, 50, 0, -40, -20],
    { ease: easeIn }
  );
  const rightIndicatorX = useTransform(
    x,
    [0, 50, 100, 150, 200],
    [20, 40, 0, -50, -100],
    { ease: easeIn }
  );

  const dragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 100) {
      setExitX(200);
      setDirection('right');
      recordSwipe(data.id, 'like');

      removeCard(data.id, 'right');
    } else if (info.offset.x < -100) {
      setExitX(-200);
      setDirection('left');
      recordSwipe(data.id, 'dislike');

      removeCard(data.id, 'left');
    }
  };

  const handleAction = (direction: 'left' | 'right') => {
    setDirection(direction);
    setExitX(direction === 'left' ? -200 : 200);
    recordSwipe(data.id, direction === 'left' ? 'dislike' : 'like');

    removeCard(data.id, direction);
  };

  const router = useRouter();

  const recordSwipe = useCallback(async (userId: string, action: 'like' | 'dislike') => {
    try {
      const response = await fetch('/apinextjs/users/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: userId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record swipe');
      }

      const result = await response.json();
      if (result.match) {
        toast("It's a Match! 🎉", {
          description: "You can now start chatting with each other!",
          action: {
            label: "Start Chat",
            onClick: () => router.push('/dashboard/chats')
          },
        });
      }
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  }, [router]);

  const handleDragStart = (event: any, info: PanInfo) => {
    setIsDragging(true);
    setDragStart({ x: info.point.x, y: info.point.y });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const openModal = () => {
    if (!isDragging) {
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  if (displayMode === 'grid') {
    return (
      <div ref={ref} className="relative aspect-[3/4] rounded-xl overflow-hidden">
        <div onClick={openModal} className="relative h-full w-full cursor-pointer group">
          <Image
            src={data.imageUrl || `/default-avatar.jpg`}
            fill
            alt={`user profile`}
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-2">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-white text-sm font-medium leading-tight">
                  {data.displayName || "No name provided"}
                </h3>
                <p className="text-white/90 text-xs">
                  {data.age} years
                </p>
              </div>
              {data.location && (
                <div className="flex items-center text-white/90">
                  <MapPin className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
          {data.spotifyConnected && (
            <div className="absolute top-2 right-2">
              <Music className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customModalStyles}
          contentLabel={`${data.displayName || "anon"}'s Profile`}
          className="rounded-2xl overflow-hidden bg-background-white shadow-xl"
        >
          <div className="no-scrollbar max-h-[85vh] overflow-y-auto">
            <div className="relative h-[40vh] md:h-[50vh]">
              <Image
                src={data.imageUrl || `/default-avatar.jpg`}
                fill
                alt={`${data.displayName || "anon"}'s profile`}
                className="object-cover"
                priority
              />
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">{data.displayName || "Anon"}</h2>
                <span className="text-lg">{data.age || '?'} years</span>
              </div>

              {data.bio && (
                <p className="text-primary-medium">
                  {data.bio}
                </p>
              )}

              {data.interests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.interests.map((userInterest: UserInterestWithInterest) => (
                      <span
                        key={userInterest.interestId}
                        className="rounded-full bg-secondary-sage px-3 py-1 text-xs"
                      >
                        {userInterest.interest.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.artists.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Top Artists</h3>
                  <UserArtistDisplay artists={data.artists} />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Hiking Preferences</h3>
                <div className="space-y-1 text-sm">
                  {data.skills.map((userSkill) => (
                    <p key={userSkill.id}>
                      {userSkill.skill.displayName}: {userSkill.skillLevel.displayName}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {!disableActions && (
              <div className="flex justify-center gap-4 p-4 border-t">
                <button
                  onClick={() => {
                    closeModal();
                    handleAction('left');
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/80 text-white transition-transform hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
                <button
                  onClick={() => {
                    closeModal();
                    handleAction('right');
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/80 text-white transition-transform hover:scale-110"
                >
                  <Check className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0.5 }}
        animate={{ scale: 1.05, opacity: 1 }}
        exit={{ x: exitX, opacity: 0, transition: { duration: 0.2 } }}
      >
        {active && (
          <>
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragStart={handleDragStart}
              onClick={openModal}
              className="card-image-wrapper card relative z-30 h-[60vh] w-[90vw] md:h-[438px] md:w-[289px] cursor-pointer"
              onDragEnd={(e, info) => {
                const dragDistance = Math.abs(info.point.x - dragStart.x);
                if (dragDistance > dragThreshold) {
                  dragEnd(e, info);
                }
                setIsDragging(false);
              }}
              style={{ x, rotate, opacity }}
              transition={{ type: 'tween', duration: 0.2 }}
              whileDrag={{ cursor: 'grabbing' }}
            >
              <div className="no-scrollbar rounded-2xl relative h-full w-full overflow-hidden bg-background-white">
                <motion.div
                  className="absolute inset-0 flex items-center justify-center z-50"
                  style={{
                    opacity: rightIndicatorOpacity,
                    scale: indicatorScale,
                    x: rightIndicatorX
                  }}
                >
                  <div className="rounded-full bg-green-500/90 p-4">
                    <Check className="h-12 w-12 text-white" />
                  </div>
                </motion.div>

                <motion.div
                  className="absolute inset-0 flex items-center justify-center z-50"
                  style={{
                    opacity: leftIndicatorOpacity,
                    scale: indicatorScale,
                    x: leftIndicatorX
                  }}
                >
                  <div className="rounded-full bg-red-500/90 p-4">
                    <X className="h-12 w-12 text-white" />
                  </div>
                </motion.div>

                <div className="relative h-full w-full">
                  <Image
                    src={data.imageUrl || `/default-avatar.jpg`}
                    fill
                    alt={`${data.displayName || "anon"}'s profile`}
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={data.imageUrl || ''} alt={data.displayName || "anon"} />
                        <AvatarFallback>{data.displayName?.[0] || "User"}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium">
                        {data.displayName || "Anon"}
                      </div>
                    </div>
                  </div>

                  {data.location && (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{data.location}</span>
                    </div>
                  )}

                  {data.spotifyConnected && (
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <Music className="h-4 w-4" />
                      <span>Spotify Connected</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <Modal
              isOpen={modalIsOpen}
              onRequestClose={closeModal}
              style={customModalStyles}
              contentLabel={`${data.displayName || "Anon"}'s Profile`}
              className="rounded-2xl overflow-hidden bg-background-white shadow-xl"
            >
              <div className="no-scrollbar max-h-[85vh] overflow-y-auto">
                <div className="relative h-[40vh] md:h-[50vh]">
                  <Image
                    src={data.imageUrl || `/default-avatar.jpg`}
                    fill
                    alt={`${data.displayName || "Anon"}'s profile`}
                    className="object-cover"
                    priority
                  />
                  <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">{data.displayName || "Anon"}</h2>
                    <span className="text-lg">{data.age || '?'} years</span>
                  </div>

                  {data.bio && (
                    <p className="text-primary-medium">
                      {data.bio}
                    </p>
                  )}

                  {data.interests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {data.interests.map((userInterest: UserInterestWithInterest) => (
                          <span
                            key={userInterest.interestId}
                            className="rounded-full bg-secondary-sage px-3 py-1 text-xs"
                          >
                            {userInterest.interest.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.artists.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Top Artists</h3>
                      <UserArtistDisplay artists={data.artists} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Hiking Preferences</h3>
                    <div className="space-y-1 text-sm">
                      {data.skills.map((userSkill) => (
                        <p key={userSkill.id}>
                          {userSkill.skill.displayName}: {userSkill.skillLevel.displayName}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          </>
        )}
      </motion.div>

      {active && !disableActions && (
        <div className="pt-6 z-40 flex gap-8">
          <button
            onClick={() => handleAction('left')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/80 text-white transition-transform hover:scale-110"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={() => handleAction('right')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/80 text-white transition-transform hover:scale-110"
          >
            <Check className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
});

UserCard.displayName = 'UserCard';

export { UserCard, UserCardSkeleton };