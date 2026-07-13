import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface EditableActivity {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  category?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  energyLevel?: string | null;
  priceLevel?: number | null;
  indoorOutdoor?: string | null;
  bestTimeOfDay?: string[] | null;
  bestSeason?: string[] | null;
  socialSetting?: string[] | null;
  url?: string | null;
  weatherDependent?: boolean | null;
  useInRecommendations: boolean;
}

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingActivity?: EditableActivity | null;
}

const ENERGY_LEVELS = ['low', 'medium', 'high'];
const PRICE_LEVELS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];
const ACTIVITY_TYPES = ['restaurant', 'bar', 'park', 'walk', 'experience', 'attraction', 'neighborhood'];
const CATEGORIES = ['food', 'drinks', 'outdoor', 'culture', 'shopping', 'nightlife'];
const INDOOR_OUTDOOR = ['indoor', 'outdoor', 'both'];
const TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'night', 'late-night'];
const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'];
const SOCIAL_SETTINGS = ['solo', 'couple', 'small-group', 'large-group'];

const emptyFormData = {
  name: '',
  description: '',
  type: '',
  category: '',
  neighborhood: '',
  address: '',
  energyLevel: 'medium',
  priceLevel: 2,
  indoorOutdoor: 'both',
  bestTimeOfDay: [] as string[],
  bestSeason: ['all'] as string[],
  socialSetting: [] as string[],
  url: '',
  weatherDependent: false,
  useInRecommendations: true,
};

function formDataFromActivity(activity: EditableActivity): typeof emptyFormData {
  return {
    name: activity.name,
    description: activity.description ?? '',
    type: activity.type ?? '',
    category: activity.category ?? '',
    neighborhood: activity.neighborhood ?? '',
    address: activity.address ?? '',
    energyLevel: activity.energyLevel ?? 'medium',
    priceLevel: activity.priceLevel ?? 2,
    indoorOutdoor: activity.indoorOutdoor ?? 'both',
    bestTimeOfDay: activity.bestTimeOfDay ?? [],
    bestSeason: activity.bestSeason ?? ['all'],
    socialSetting: activity.socialSetting ?? [],
    url: activity.url ?? '',
    weatherDependent: activity.weatherDependent ?? false,
    useInRecommendations: activity.useInRecommendations,
  };
}

export default function AddActivityModal({ isOpen, onClose, editingActivity }: AddActivityModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingActivity;
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(editingActivity ? formDataFromActivity(editingActivity) : emptyFormData);
  }, [isOpen, editingActivity]);

  const addActivityMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(
        isEditing ? `/api/user-activities/${editingActivity!.id}` : '/api/user-activities',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'add'} activity`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activities'] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addActivityMutation.mutate(formData);
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Your Activity' : 'Add Your Activity'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., My favorite coffee shop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="What makes this activity special?"
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select type</option>
                {ACTIVITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Neighborhood
            </label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Montrose, Heights, Midtown"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Street address"
            />
          </div>

          {/* Energy and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Energy Level
              </label>
              <select
                value={formData.energyLevel}
                onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ENERGY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Level
              </label>
              <select
                value={formData.priceLevel}
                onChange={(e) => setFormData({ ...formData, priceLevel: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PRICE_LEVELS.map(price => (
                  <option key={price.value} value={price.value}>{price.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Indoor/Outdoor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Indoor or Outdoor?
            </label>
            <select
              value={formData.indoorOutdoor}
              onChange={(e) => setFormData({ ...formData, indoorOutdoor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {INDOOR_OUTDOOR.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Best Time of Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Best Time of Day (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMES_OF_DAY.map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    bestTimeOfDay: toggleArrayItem(formData.bestTimeOfDay, time)
                  })}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.bestTimeOfDay.includes(time)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Social Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Good for (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_SETTINGS.map(setting => (
                <button
                  key={setting}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    socialSetting: toggleArrayItem(formData.socialSetting, setting)
                  })}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.socialSetting.includes(setting)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {setting}
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website (Optional)
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.weatherDependent}
                onChange={(e) => setFormData({ ...formData, weatherDependent: e.target.checked })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Weather dependent (requires good weather)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.useInRecommendations}
                onChange={(e) => setFormData({ ...formData, useInRecommendations: e.target.checked })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Use in AI recommendations</span>
            </label>
          </div>

          {/* Error Message */}
          {addActivityMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {addActivityMutation.error instanceof Error
                ? addActivityMutation.error.message
                : 'Failed to add activity'}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addActivityMutation.isPending || !formData.name}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {addActivityMutation.isPending
                ? (isEditing ? 'Saving...' : 'Adding...')
                : (isEditing ? 'Save Changes' : 'Add Activity')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
