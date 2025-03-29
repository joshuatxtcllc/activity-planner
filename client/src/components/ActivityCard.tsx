import { Music, Calendar, MapPin, GlassWater, Paintbrush } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface ActivityCardProps {
  title: string;
  isPrivate: boolean;
  isFeatured?: boolean;
  date: string;
  location: string;
  tags: Array<{
    name: string;
    color: "secondary" | "accent" | "default";
  }>;
  attendees: number;
  icon: "music" | "cocktail" | "art";
  iconBgClass: string;
}

const ActivityCard = ({
  title,
  isPrivate,
  isFeatured = false,
  date,
  location,
  tags,
  attendees,
  icon,
  iconBgClass,
}: ActivityCardProps) => {
  const renderIcon = () => {
    switch (icon) {
      case "music":
        return <Music className="h-16 w-16 text-primary opacity-70" />;
      case "cocktail":
        return <GlassWater className="h-16 w-16 text-secondary opacity-70" />;
      case "art":
        return <Paintbrush className="h-16 w-16 text-accent opacity-70" />;
      default:
        return <Music className="h-16 w-16 text-primary opacity-70" />;
    }
  };

  const getTagColorClass = (color: "secondary" | "accent" | "default") => {
    switch (color) {
      case "secondary":
        return "text-secondary";
      case "accent":
        return "text-accent";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="activity-card bg-dark-surface rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:translate-y-[-4px] hover:shadow-xl">
      <div className={`h-40 ${iconBgClass} flex items-center justify-center relative`}>
        {isFeatured && (
          <div className="absolute top-3 right-3 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
            FEATURED
          </div>
        )}
        {renderIcon()}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-xl font-bold text-light">{title}</h2>
          <span className={`${isPrivate ? 'bg-primary' : 'bg-secondary'} text-white text-xs px-2 py-1 rounded`}>
            {isPrivate ? 'Private' : 'Public'}
          </span>
        </div>
        <div className="flex items-center text-gray-400 text-sm mb-2">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{date}</span>
        </div>
        <div className="flex items-center text-gray-400 text-sm mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{location}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span 
              key={index} 
              className={`bg-dark ${getTagColorClass(tag.color)} text-xs px-2 py-1 rounded-full`}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            {Array(Math.min(2, attendees))
              .fill(0)
              .map((_, index) => (
                <Avatar key={index} className="h-8 w-8 border-2 border-dark-surface">
                  <AvatarFallback>
                    {String.fromCharCode(65 + index)}
                  </AvatarFallback>
                </Avatar>
              ))}
            {attendees > 2 && (
              <div className="h-8 w-8 rounded-full border-2 border-dark-surface bg-dark flex items-center justify-center text-xs text-gray-400">
                +{attendees - 2}
              </div>
            )}
          </div>
          <button className="text-accent hover:text-white border border-accent hover:bg-accent rounded-lg px-3 py-1 text-sm transition-colors duration-200">
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
