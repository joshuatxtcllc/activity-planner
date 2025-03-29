import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { ActivityType } from "@/pages/Dashboard";

interface SpinningWheelProps {
  activities: ActivityType[];
  onActivitySelected: (activity: ActivityType) => void;
}

const SpinningWheel = ({ activities, onActivitySelected }: SpinningWheelProps) => {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw the wheel whenever activities change or when selected
  useEffect(() => {
    drawWheel();
  }, [activities, selectedActivity]);

  const drawWheel = () => {
    if (!canvasRef.current || activities.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw wheel segments
    const segmentAngle = (2 * Math.PI) / activities.length;
    
    activities.forEach((activity, index) => {
      // Start and end angles for this segment
      const startAngle = index * segmentAngle;
      const endAngle = (index + 1) * segmentAngle;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Set fill color based on activity type or index
      let fillColor;
      switch (activity.icon) {
        case "music":
          fillColor = "hsl(262, 43%, 51%)"; // primary
          break;
        case "cocktail":
          fillColor = "hsl(214, 59%, 52%)"; // secondary
          break;
        case "art":
          fillColor = "hsl(342, 92%, 54%)"; // accent
          break;
        default:
          // Alternate colors for other activities
          fillColor = index % 2 === 0 
            ? "hsl(262, 43%, 51%)" 
            : "hsl(342, 92%, 54%)";
      }
      
      // Highlight selected segment
      if (selectedActivity && selectedActivity.id === activity.id) {
        ctx.fillStyle = "hsl(342, 92%, 65%)"; // Brighter accent
      } else {
        ctx.fillStyle = fillColor;
      }
      
      ctx.fill();
      
      // Add a white border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      
      // Position text in the middle of the segment
      const textRadius = radius * 0.75;
      ctx.translate(textRadius, 0);
      ctx.rotate(Math.PI / 2); // Rotate text
      
      // Truncate text if too long
      const maxLength = 15;
      const displayText = activity.title.length > maxLength
        ? activity.title.substring(0, maxLength) + "..."
        : activity.title;
        
      ctx.fillText(displayText, 0, 0);
      ctx.restore();
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "hsl(240, 10%, 3.9%)"; // dark
    ctx.fill();
    ctx.strokeStyle = "hsl(342, 92%, 54%)"; // accent
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 15);
    ctx.lineTo(centerX - 10, centerY - 35);
    ctx.lineTo(centerX + 10, centerY - 35);
    ctx.closePath();
    ctx.fillStyle = "hsl(342, 92%, 54%)"; // accent
    ctx.fill();
  };

  const spinWheel = () => {
    if (isSpinning || activities.length === 0) return;
    
    setIsSpinning(true);
    setSelectedActivity(null);
    
    // Generate random number of rotations (3-5 full rotations plus a random angle)
    const spinDuration = 3000; // 3 seconds
    const fullRotations = Math.floor(Math.random() * 3) + 3; // 3-5 rotations
    const randomAngle = Math.random() * 360;
    const totalDegrees = fullRotations * 360 + randomAngle;
    
    // Calculate which activity will be selected based on final rotation
    const segmentAngle = 360 / activities.length;
    // We add rotation % 360 to account for current rotation 
    const normalizedAngle = (totalDegrees + rotation) % 360;
    const segmentIndex = activities.length - 1 - Math.floor(normalizedAngle / segmentAngle);
    const selectedActivityIndex = segmentIndex % activities.length;
    
    // Animate rotation
    const startRotation = rotation;
    const startTime = performance.now();
    
    const animateRotation = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      // Easing function for natural spin-down
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const currentRotation = startRotation + totalDegrees * easeOut(progress);
      
      setRotation(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        // Spinning completed
        setIsSpinning(false);
        
        // Select the activity
        const selected = activities[selectedActivityIndex];
        setSelectedActivity(selected);
        onActivitySelected(selected);
        
        // Show toast
        toast({
          title: "Activity Selected!",
          description: `Let's go with "${selected.title}"`,
        });
      }
    };
    
    requestAnimationFrame(animateRotation);
  };

  return (
    <div className="flex flex-col items-center my-8">
      <h2 className="text-2xl font-bold mb-4 text-light flex items-center">
        <Sparkles className="w-6 h-6 mr-2 text-accent" />
        Random Activity Picker
      </h2>
      <p className="text-gray-400 mb-6 text-center">
        Can't decide what to do? Let the wheel of fortune decide for you!
      </p>
      
      <div className="relative mb-6">
        <div 
          className="wheel-container" 
          style={{ 
            width: '300px', 
            height: '300px', 
            position: 'relative' 
          }}
        >
          <canvas 
            ref={canvasRef} 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
            }}
          />
        </div>
      </div>
      
      <Button
        disabled={isSpinning || activities.length === 0}
        onClick={spinWheel}
        className="bg-accent hover:bg-opacity-80 text-white font-medium py-2 px-6 rounded-lg text-lg"
      >
        {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
      </Button>
      
      {selectedActivity && (
        <div className="mt-6 p-4 bg-dark-surface rounded-lg border border-gray-700">
          <p className="text-light font-medium">
            Selected: <span className="text-accent">{selectedActivity.title}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default SpinningWheel;