import { ActivityCardProps } from '../../types/ActivityCardProps';
import {
  easeIn,
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const CardSkeleton = () => {
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

const Card = ({ data, active, removeCard }: ActivityCardProps) => {
  const [exitX, setExitX] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const recordSwipe = useCallback(async (activityId: number, action: 'like' | 'dislike') => {
    try {
      const response = await fetch('/apinextjs/activities/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record swipe');
      }
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  }, []);

  const dragEnd = async (event: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 100) {
      setExitX(200);
      setDirection('right');
      // add await but then you will get a delay
      recordSwipe(data.id, 'like');
      removeCard(data.id, 'right');
    } else if (info.offset.x < -100) {
      setExitX(-200);
      setDirection('left');
      // add await but then you will get a delay
      // await recordSwipe(data.id, 'dislike');
      recordSwipe(data.id, 'dislike');
      removeCard(data.id, 'left');
    }
  };

  const handleAction = async (direction: 'left' | 'right') => {
    setDirection(direction);
    setExitX(direction === 'left' ? -200 : 200);
    await recordSwipe(data.id, direction === 'left' ? 'dislike' : 'like');
    removeCard(data.id, direction);
  };

  return (
    <div className="absolute flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0.5 }}
        animate={{ scale: 1.05, opacity: 1 }}
        exit={{ 
          x: exitX,
          opacity: 0,
          transition: { duration: 0.2 }
        }}
      >
        {active ? (
          <Dialog>
            <DialogTrigger asChild>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragStart={() => setIsDragging(true)}
                onClick={(e) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="card-image-wrapper card relative z-30 h-[70vh] w-[90vw] md:h-[438px] md:w-[289px]   cursor-pointer"
                onDragEnd={dragEnd}
                style={{ x, rotate, opacity }}
                transition={{ type: 'tween', duration: 0.2 }}
                whileDrag={{ cursor: 'grabbing' }}
              >
                <div className="no-scrollbar rounded-2xl relative h-full w-full overflow-hidden bg-background-white ">
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
                      src={data.primaryImageId && data.primaryImageId !== "" 
                        ? `https://img.oastatic.com/img2/${data.primaryImageId}/default/variant.jpg`
                        : '/images/fallback-hike.jpg'
                      }
                      fill
                      alt={data.title}
                      className="object-cover"
                      priority
                      onError={(e: any) => {
                        e.target.src = '/images/fallback-hike.jpg'
                      }}
                    />
                  </div>
                  
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                    <h2 className="text-xl font-semibold mb-2">{data.title}</h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{data.primaryRegion}</span>
                      <span>•</span>
                      <span>{data.length}m</span>
                      <span>•</span>
                      <span>{data.difficulty}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogTrigger>

            <DialogContent className="fixed p-0 border-none !rounded-2xl overflow-hidden md:left-[calc(50%+120px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] md:max-w-[400px]">
              <div className="no-scrollbar max-h-[85vh] overflow-y-auto rounded-2xl">
                <div className="relative h-[40vh] md:h-[50vh]">
                  <Image
                    src={data.primaryImageId && data.primaryImageId !== "" 
                      ? `https://img.oastatic.com/img2/${data.primaryImageId}/default/variant.jpg`
                      : '/images/fallback-hike.jpg'
                    }
                    fill
                    alt={data.title}
                    className="object-cover rounded-t-2xl"
                    priority
                    onError={(e: any) => {
                      e.target.src = '/images/fallback-hike.jpg'
                    }}
                  />
                </div>

                <div className="space-y-4 p-6 bg-background-white  rounded-b-2xl">
                  <h2 className="text-2xl font-semibold">{data.title}</h2>
                  
                  <p className="text-primary-medium ">
                    {data.teaserText}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary-sage  px-3 py-1 text-xs text-primary ">
                      Difficulty: {data.difficulty}
                    </span>
                    <span className="rounded-full bg-secondary-sage  px-3 py-1 text-xs text-primary ">
                      ↑ {data.ascent}m
                    </span>
                    <span className="rounded-full bg-secondary-sage  px-3 py-1 text-xs text-primary ">
                      ↓ {data.descent}m
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">Details</h3>
                    <div className="space-y-2 text-sm">
                      <p>Duration: {Math.round(data.durationMin / 60)} hours</p>
                      <p>Max Altitude: {data.maxAltitude}m</p>
                      <p>Region: {data.primaryRegion}</p>
                      {data.publicTransportFriendly && (
                        <p className="text-teal-700 ">Public Transport Friendly</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </motion.div>

      {active && (
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
};

export { Card, CardSkeleton };