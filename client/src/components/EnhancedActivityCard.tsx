import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import { Button } from './ui/button';
import { 
  Calendar, 
  MapPin, 
  Star, 
  ExternalLink,
  Heart,
  Share2,
  Clock,
  Users,
  Plus
} from 'lucide-react';
import { CategoryBadge, CostLevelBadge, TimeCommitmentBadge } from './CategoryBadge';
import { EnhancedActivityType } from '@/lib/activityModel';
import { cn } from '@/lib/utils';

interface EnhancedActivityCardProps {
  activity: EnhancedActivityType;
  onSave?: () => void;
  onShare?: () => void;
  onAddToCalendar?: () => void;
  onViewDetails?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

const EnhancedActivityCard: React.FC<EnhancedActivityCardProps> = ({
  activity,
  onSave,
  onShare,
  onAddToCalendar,
  onViewDetails,
  variant = 'default',
  className
}) => {
  const {
    title,
    description,
    category,
    costLevel,
    timeCommitment,
    location,
    imageUrl,
    rating,
    tags,
    date,
    eventUrl,
    attendees
  } = activity;

  // Different layouts based on variant
  if (variant === 'compact') {
    return (
      <Card className={cn("overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors", className)}>
        <div className="flex h-full">
          {imageUrl && (
            <div className="w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 flex flex-col justify-between p-3">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-sm mb-1 line-clamp-1">{title}</h3>
                <CategoryBadge category={category} size="sm" withLabel={false} />
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                <MapPin size={12} className="mr-1" />
                <span className="truncate">{location}</span>
              </div>
              {date && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={12} className="mr-1" />
                  <span>{date}</span>
                </div>
              )}
            </div>
            {onViewDetails && (
              <div className="mt-2 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onViewDetails}
                  className="h-7 px-2 text-xs"
                >
                  View
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card className={cn("overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow", className)}>
        {imageUrl ? (
          <div className="aspect-video w-full overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-accent/20"></div>
        )}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CategoryBadge category={category} size="sm" />
                {rating && (
                  <div className="flex items-center">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs ml-1 font-medium">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <CardTitle className="text-xl">{title}</CardTitle>
            </div>
            {onSave && (
              <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8">
                <Heart className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap gap-2 mb-3">
            <CostLevelBadge costLevel={costLevel} size="sm" />
            <TimeCommitmentBadge timeCommitment={timeCommitment} size="sm" />
          </div>
          <div className="flex flex-col space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>{location}</span>
            </div>
            {date && (
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span>{date}</span>
              </div>
            )}
            {attendees && (
              <div className="flex items-center">
                <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span>{attendees} attendees</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex gap-2">
          {onViewDetails && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onViewDetails}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          {onAddToCalendar && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddToCalendar}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          )}
          {onShare && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn("border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CategoryBadge category={category} size="sm" />
          {onSave && (
            <Button variant="ghost" size="icon" onClick={onSave} className="h-8 w-8">
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardTitle className="line-clamp-1">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 mb-3">
          <CostLevelBadge costLevel={costLevel} size="sm" />
          <TimeCommitmentBadge timeCommitment={timeCommitment} size="sm" />
        </div>
        <div className="flex flex-col space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {date && (
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>{date}</span>
            </div>
          )}
        </div>
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tag.color === "secondary"
                    ? "bg-secondary/20 text-secondary"
                    : tag.color === "accent"
                    ? "bg-accent/20 text-accent"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                }`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-1">
        {onViewDetails && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={onViewDetails}
            className="w-full"
          >
            View Details
          </Button>
        )}
        {eventUrl && !onViewDetails && (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={() => window.open(eventUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Website
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default EnhancedActivityCard;