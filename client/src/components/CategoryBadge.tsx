import React from 'react';
import { CategoryType, activityCategories } from '../lib/activityCategories';
import { CostLevelType, costLevels } from '../lib/activityCategories';
import { TimeCommitmentType, timeCommitments } from '../lib/activityCategories';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: CategoryType;
  size?: 'sm' | 'md' | 'lg';
  withLabel?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  category, 
  size = 'md', 
  withLabel = true,
  className
}) => {
  const categoryInfo = activityCategories[category];
  if (!categoryInfo) return null;
  
  const { label, icon: Icon, color } = categoryInfo;
  
  const sizeClasses = {
    sm: 'text-xs p-1',
    md: 'text-sm p-1.5',
    lg: 'text-base p-2'
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };
  
  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 rounded-full', 
        color,
        sizeClasses[size],
        withLabel ? 'px-3' : '',
        className
      )}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      {withLabel && <span className="font-medium">{label}</span>}
    </div>
  );
};

interface CostLevelBadgeProps {
  costLevel: CostLevelType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CostLevelBadge: React.FC<CostLevelBadgeProps> = ({ 
  costLevel, 
  size = 'md',
  className
}) => {
  const costInfo = costLevels[costLevel];
  if (!costInfo) return null;
  
  const { label, icon: Icon } = costInfo;
  
  const sizeClasses = {
    sm: 'text-xs p-1',
    md: 'text-sm p-1.5',
    lg: 'text-base p-2'
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };
  
  const colorClasses = {
    'FREE': 'bg-green-100 text-green-800',
    'LOW': 'bg-blue-100 text-blue-800',
    'MEDIUM': 'bg-orange-100 text-orange-800',
    'HIGH': 'bg-red-100 text-red-800'
  };
  
  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2', 
        colorClasses[costLevel],
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      <span className="font-medium">{label}</span>
    </div>
  );
};

interface TimeCommitmentBadgeProps {
  timeCommitment: TimeCommitmentType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TimeCommitmentBadge: React.FC<TimeCommitmentBadgeProps> = ({ 
  timeCommitment, 
  size = 'md',
  className
}) => {
  const timeInfo = timeCommitments[timeCommitment];
  if (!timeInfo) return null;
  
  const { label, icon: Icon } = timeInfo;
  
  const sizeClasses = {
    sm: 'text-xs p-1',
    md: 'text-sm p-1.5',
    lg: 'text-base p-2'
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };
  
  const colorClasses = {
    'QUICK': 'bg-green-100 text-green-800',
    'SHORT': 'bg-blue-100 text-blue-800',
    'MEDIUM': 'bg-purple-100 text-purple-800',
    'LONG': 'bg-orange-100 text-orange-800',
    'MULTI_DAY': 'bg-red-100 text-red-800'
  };
  
  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2', 
        colorClasses[timeCommitment],
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      <span className="font-medium">{label}</span>
    </div>
  );
}