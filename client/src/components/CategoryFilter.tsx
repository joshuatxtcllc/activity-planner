import React, { useState } from 'react';
import { CategoryType, activityCategories } from '../lib/activityCategories';
import { CostLevelType, costLevels } from '../lib/activityCategories';
import { TimeCommitmentType, timeCommitments } from '../lib/activityCategories';
import { Check, Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { CategoryBadge, CostLevelBadge, TimeCommitmentBadge } from './CategoryBadge';

interface CategoryFilterProps {
  onFilterChange: (filters: {
    categories: CategoryType[];
    costs: CostLevelType[];
    times: TimeCommitmentType[];
  }) => void;
  compact?: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ 
  onFilterChange, 
  compact = false 
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [selectedCosts, setSelectedCosts] = useState<CostLevelType[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<TimeCommitmentType[]>([]);

  const handleCategoryClick = (category: CategoryType) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    onFilterChange({
      categories: newCategories,
      costs: selectedCosts,
      times: selectedTimes
    });
  };

  const handleCostClick = (cost: CostLevelType) => {
    const newCosts = selectedCosts.includes(cost)
      ? selectedCosts.filter(c => c !== cost)
      : [...selectedCosts, cost];
    
    setSelectedCosts(newCosts);
    onFilterChange({
      categories: selectedCategories,
      costs: newCosts,
      times: selectedTimes
    });
  };

  const handleTimeClick = (time: TimeCommitmentType) => {
    const newTimes = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time];
    
    setSelectedTimes(newTimes);
    onFilterChange({
      categories: selectedCategories,
      costs: selectedCosts,
      times: newTimes
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCosts([]);
    setSelectedTimes([]);
    onFilterChange({
      categories: [],
      costs: [],
      times: []
    });
  };

  const hasFilters = selectedCategories.length > 0 || selectedCosts.length > 0 || selectedTimes.length > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Filter size={18} />
          <span>Filters</span>
          {compact && (expanded ? <X size={16} /> : <span className="text-xs">+</span>)}
        </Button>
        
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {(expanded || !compact) && (
        <div className="space-y-4">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-medium mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activityCategories).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key as CategoryType)}
                  className="group relative"
                >
                  <CategoryBadge 
                    category={key as CategoryType} 
                    withLabel 
                    className={selectedCategories.includes(key as CategoryType) 
                      ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' 
                      : 'opacity-80 hover:opacity-100'
                    }
                  />
                  {selectedCategories.includes(key as CategoryType) && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <h3 className="text-sm font-medium mb-2">Cost</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(costLevels).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleCostClick(key as CostLevelType)}
                  className="group relative"
                >
                  <CostLevelBadge 
                    costLevel={key as CostLevelType}
                    className={selectedCosts.includes(key as CostLevelType) 
                      ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' 
                      : 'opacity-80 hover:opacity-100'
                    }
                  />
                  {selectedCosts.includes(key as CostLevelType) && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <h3 className="text-sm font-medium mb-2">Time</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(timeCommitments).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleTimeClick(key as TimeCommitmentType)}
                  className="group relative"
                >
                  <TimeCommitmentBadge 
                    timeCommitment={key as TimeCommitmentType} 
                    className={selectedTimes.includes(key as TimeCommitmentType) 
                      ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' 
                      : 'opacity-80 hover:opacity-100'
                    }
                  />
                  {selectedTimes.includes(key as TimeCommitmentType) && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing activities with {selectedCategories.length > 0 ? `${selectedCategories.length} categories` : ''} 
            {selectedCosts.length > 0 ? ` • ${selectedCosts.length} price options` : ''}
            {selectedTimes.length > 0 ? ` • ${selectedTimes.length} time frames` : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;