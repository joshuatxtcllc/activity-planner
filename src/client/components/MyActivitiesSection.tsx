import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddActivityModal from './AddActivityModal';

interface UserActivity {
  id: string;
  name: string;
  description?: string;
  type?: string;
  category?: string;
  neighborhood?: string;
  address?: string;
  energyLevel?: string;
  priceLevel?: number;
  indoorOutdoor?: string;
  bestTimeOfDay?: string[];
  bestSeason?: string[];
  socialSetting?: string[];
  url?: string;
  weatherDependent?: boolean;
  useInRecommendations: boolean;
  timesRecommended: number;
  createdAt: string;
}

export default function MyActivitiesSection() {
  const queryClient = useQueryClient();
  const [editingActivity, setEditingActivity] = useState<UserActivity | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: activities = [], isLoading } = useQuery<UserActivity[]>({
    queryKey: ['user-activities'],
    queryFn: async () => {
      const response = await fetch('/api/user-activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
  });

  const toggleRecommendationsMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/user-activities/${id}/toggle-recommendations`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle recommendations');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activities'] });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/user-activities/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activities'] });
    },
  });

  const getPriceLevelDisplay = (level?: number) => {
    if (!level) return 'N/A';
    return '$'.repeat(level);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Activities</h2>
        <p className="text-gray-600">Loading your activities...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Activities</h2>
        <p className="text-gray-600">
          You haven't added any activities yet. Click "Add Activity" to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        My Activities ({activities.length})
      </h2>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{activity.name}</h3>

                <div className="flex flex-wrap gap-2 mt-2">
                  {activity.neighborhood && (
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {activity.neighborhood}
                    </span>
                  )}
                  {activity.type && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {activity.type}
                    </span>
                  )}
                  {activity.priceLevel && (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {getPriceLevelDisplay(activity.priceLevel)}
                    </span>
                  )}
                  {activity.energyLevel && (
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      {activity.energyLevel} energy
                    </span>
                  )}
                </div>

                {expandedId === activity.id && activity.description && (
                  <p className="mt-3 text-sm text-gray-600">{activity.description}</p>
                )}

                {activity.timesRecommended > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Recommended {activity.timesRecommended} time{activity.timesRecommended !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                {activity.description && (
                  <button
                    onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                    title={expandedId === activity.id ? 'Show less' : 'Show more'}
                  >
                    {expandedId === activity.id ? '−' : '+'}
                  </button>
                )}

                <button
                  onClick={() => toggleRecommendationsMutation.mutate(activity.id)}
                  disabled={toggleRecommendationsMutation.isPending}
                  className={`text-sm px-3 py-1 rounded ${
                    activity.useInRecommendations
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                  title={activity.useInRecommendations ? 'Disable from recommendations' : 'Enable in recommendations'}
                >
                  {activity.useInRecommendations ? '✓ Active' : '○ Inactive'}
                </button>

                <button
                  onClick={() => setEditingActivity(activity)}
                  className="text-gray-500 hover:text-gray-700 text-sm px-2"
                  title="Edit activity"
                >
                  ✏️
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${activity.name}"?`)) {
                      deleteActivityMutation.mutate(activity.id);
                    }
                  }}
                  disabled={deleteActivityMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 disabled:opacity-50"
                  title="Delete activity"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(toggleRecommendationsMutation.isError || deleteActivityMutation.isError) && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          An error occurred. Please try again.
        </div>
      )}

      <AddActivityModal
        isOpen={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        editingActivity={editingActivity}
      />
    </div>
  );
}
