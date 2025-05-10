import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { EnhancedActivityType } from '@/lib/activityModel';
import { CategoryBadge } from './CategoryBadge';
import { 
  RotateCw, 
  CheckCircle, 
  Calendar, 
  Share2,
  ExternalLink,
  Timer,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinningWheelProps {
  activities: EnhancedActivityType[];
  onActivitySelected: (activity: EnhancedActivityType) => void;
}

const SpinningWheel: React.FC<SpinningWheelProps> = ({ 
  activities, 
  onActivitySelected 
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<EnhancedActivityType | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spinDuration = 5000; // 5 seconds of spinning

  // Calculate wheel segments based on activities
  const totalActivities = activities.length;
  const segmentAngle = 360 / totalActivities;

  // Ensure we have activities to display
  useEffect(() => {
    if (selectedActivity && !activities.some(a => a.id === selectedActivity.id)) {
      setSelectedActivity(null);
      setShowResult(false);
    }
  }, [activities, selectedActivity]);

  const spinWheel = () => {
    if (spinning || activities.length === 0) return;
    
    // Clear any existing timeouts
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }
    
    setSpinning(true);
    setShowResult(false);
    
    // Generate a random rotation (at least 5 full spins for effect)
    const minSpins = 5;
    const randomSpin = Math.floor(Math.random() * 360);
    const newRotation = rotation + (minSpins * 360) + randomSpin;
    setRotation(newRotation);
    
    // Calculate which activity will be selected
    const selectedIndex = Math.floor(
      ((newRotation % 360) / segmentAngle)
    ) % totalActivities;
    
    const selected = activities[totalActivities - 1 - selectedIndex];
    
    // Set timeout to stop spinning and show result
    spinTimeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setSelectedActivity(selected);
      setShowResult(true);
      if (onActivitySelected) {
        onActivitySelected(selected);
      }
    }, spinDuration);
  };

  const handleAcceptActivity = () => {
    if (selectedActivity) {
      // Additional logic for accepting activity
      setShowResult(false);
    }
  };

  const handleSpinAgain = () => {
    setShowResult(false);
    setSelectedActivity(null);
    // Wait a moment before spinning again
    setTimeout(() => {
      spinWheel();
    }, 300);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Activity Wheel</h2>
      
      <div className="relative w-full max-w-md aspect-square mb-8">
        {/* Wheel */}
        <div
          ref={wheelRef}
          className={cn(
            "absolute inset-0 rounded-full border-4 border-accent overflow-hidden transition-transform duration-5000 ease-out",
            spinning ? "will-change-transform" : ""
          )}
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? `${spinDuration}ms` : '0ms'
          }}
        >
          {activities.map((activity, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            const isEven = index % 2 === 0;
            
            return (
              <div
                key={activity.id}
                className={cn(
                  "absolute top-0 left-0 w-full h-full origin-bottom-center",
                  isEven ? "bg-primary/20" : "bg-secondary/20"
                )}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(startAngle * Math.PI / 180)}% ${50 + 50 * Math.sin(startAngle * Math.PI / 180)}%, ${50 + 50 * Math.cos(endAngle * Math.PI / 180)}% ${50 + 50 * Math.sin(endAngle * Math.PI / 180)}%)`,
                }}
              >
                {/* Activity name rotated to be readable */}
                <div
                  className="absolute text-xs font-medium truncate max-w-24 text-center"
                  style={{
                    top: '30%',
                    left: '50%',
                    transform: `translateX(-50%) rotate(${(startAngle + segmentAngle / 2) - rotation}deg)`,
                  }}
                >
                  {activity.title}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Center marker/pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-accent z-10"></div>
        
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-accent shadow-lg flex items-center justify-center z-10">
          <RotateCw className={cn("w-6 h-6 text-white", spinning ? "animate-spin" : "")} />
        </div>
      </div>
      
      <Button
        size="lg"
        onClick={spinWheel}
        disabled={spinning || activities.length === 0}
        className="mb-4"
      >
        {spinning ? "Spinning..." : "Spin the Wheel"}
      </Button>
      
      {/* Selected Activity Result */}
      {showResult && selectedActivity && (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Activity</h3>
            <CategoryBadge category={selectedActivity.category} size="sm" />
          </div>
          
          <div className="p-4">
            <h4 className="text-2xl font-bold mb-2">{selectedActivity.title}</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {selectedActivity.description}
            </p>
            
            <div className="flex flex-col space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="mr-2 h-4 w-4" />
                <span>{selectedActivity.location}</span>
              </div>
              
              {selectedActivity.date && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{selectedActivity.date}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Timer className="mr-2 h-4 w-4" />
                <span>{selectedActivity.timeCommitment}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="default"
                className="flex-1"
                onClick={handleAcceptActivity}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Let's Do It!
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSpinAgain}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Spin Again
              </Button>
            </div>
            
            <div className="flex gap-2 mt-2">
              {selectedActivity.eventUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(selectedActivity.eventUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Add to Calendar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {activities.length === 0 && (
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg w-full max-w-md">
          <p className="text-gray-500 dark:text-gray-400">
            No activities available. Add some activities first.
          </p>
        </div>
      )}
    </div>
  );
};

export default SpinningWheel;