import React from 'react';
import ActivityCategoriesShowcase from '@/components/ActivityCategoriesShowcase';
import { useToast } from '@/hooks/use-toast';
import { EnhancedActivityType } from '@/lib/activityModel';

export default function ActivityCategoriesPage() {
  const { toast } = useToast();

  const handleSaveActivity = (activity: EnhancedActivityType) => {
    toast({
      title: "Activity Saved",
      description: `"${activity.title}" has been added to your activities.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ActivityCategoriesShowcase onSaveActivity={handleSaveActivity} />
    </div>
  );
}