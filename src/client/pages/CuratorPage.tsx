import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import AddActivityModal from '../components/AddActivityModal';
import MyActivitiesSection from '../components/MyActivitiesSection';

interface VibeMode {
  id: string;
  name: string;
  emoji: string;
}

interface Activity {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  neighborhood: string;
  priceLevel: number;
  energyLevel: string;
  typicalDuration: number;
  url?: string;
  reasoning?: string;
  score?: number;
}

interface ConversationResponse {
  conversationId?: string;
  message: string;
  needsMoreInfo?: boolean;
  question?: string;
  recommendations?: Activity[];
  vibeModes?: string;
  context?: {
    weather: {
      temperature: number;
      condition: string;
      description: string;
    };
    timeOfDay: string;
    season: string;
  };
}

const QUICK_VIBES: VibeMode[] = [
  { id: 'high-energy', name: 'High Energy', emoji: '🔥' },
  { id: 'date-night', name: 'Date Night', emoji: '💕' },
  { id: 'cheap-fun', name: 'Cheap Fun', emoji: '💰' },
  { id: 'late-night', name: 'Late Night', emoji: '🌙' },
  { id: 'artsy', name: 'Artsy', emoji: '🎨' },
  { id: 'foodie', name: 'Foodie', emoji: '🍽️' },
  { id: 'chill', name: 'Chill', emoji: '😌' },
  { id: 'nature-lover', name: 'Nature', emoji: '🌳' },
];

export default function CuratorPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [recommendations, setRecommendations] = useState<Activity[]>([]);
  const [weatherContext, setWeatherContext] = useState<ConversationResponse['context'] | null>(null);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);

  // Start conversation
  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/curator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      return response.json() as Promise<ConversationResponse>;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId!);
      setMessages([{ role: 'assistant', content: data.message }]);
      setWeatherContext(data.context || null);
    },
  });

  // Send user response
  const respondMutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await fetch('/api/curator/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userInput: input,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      return response.json() as Promise<ConversationResponse>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    },
  });

  // Quick vibe recommendation (no conversation)
  const quickVibeMutation = useMutation({
    mutationFn: async (vibe: string) => {
      const response = await fetch(`/api/curator/quick-recommend?vibe=${vibe}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      return response.json() as Promise<ConversationResponse>;
    },
    onSuccess: (data) => {
      setMessages([
        { role: 'user', content: 'Quick recommendation' },
        { role: 'assistant', content: data.message },
      ]);

      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    },
  });

  const handleStart = () => {
    startMutation.mutate();
  };

  const handleSend = () => {
    if (!userInput.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: userInput }]);
    respondMutation.mutate(userInput);
    setUserInput('');
  };

  const handleQuickVibe = (vibeId: string) => {
    quickVibeMutation.mutate(vibeId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPriceSymbol = (level: number) => '$'.repeat(level);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              🎯 Local Activity Curator
            </h1>
            <button
              onClick={() => setIsAddActivityModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
              title="Add your own activity"
            >
              + Add Activity
            </button>
          </div>
          <p className="text-lg text-gray-600">
            Your personal guide to evergreen Houston activities
          </p>
          {weatherContext && (
            <div className="mt-4 inline-block bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">
                {weatherContext.weather.temperature}°F, {weatherContext.weather.condition} •{' '}
                {weatherContext.timeOfDay} • {weatherContext.season}
              </span>
            </div>
          )}
        </div>

        {/* Quick Vibe Selection */}
        {messages.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Choose your vibe or start a conversation
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {QUICK_VIBES.map((vibe) => (
                <button
                  key={vibe.id}
                  onClick={() => handleQuickVibe(vibe.id)}
                  disabled={quickVibeMutation.isPending}
                  className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-4xl mb-2">{vibe.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{vibe.name}</span>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">Or start a personalized conversation</p>
              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startMutation.isPending ? 'Starting...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {(startMutation.isPending ||
                respondMutation.isPending ||
                quickVibeMutation.isPending) && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {conversationId && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={respondMutation.isPending}
                />
                <button
                  onClick={handleSend}
                  disabled={!userInput.trim() || respondMutation.isPending}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Recommendations</h2>

            {recommendations.map((activity, idx) => (
              <div
                key={activity.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold text-indigo-600 mr-3">
                      {idx + 1}.
                    </span>
                    <span className="text-xl font-bold text-gray-900">{activity.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {activity.neighborhood}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                      {getPriceSymbol(activity.priceLevel)}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-3">{activity.description}</p>

                {activity.reasoning && (
                  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 mb-3">
                    <p className="text-sm text-indigo-900">
                      <strong>Why this works:</strong> {activity.reasoning}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {activity.type}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {activity.energyLevel} energy
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    ~{activity.typicalDuration} min
                  </span>
                </div>

                {activity.url && (
                  <a
                    href={activity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error States */}
        {startMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to start conversation. Please try again.
          </div>
        )}

        {respondMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to get response. Please try again.
          </div>
        )}

        {quickVibeMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            Failed to get recommendations. Please try again.
          </div>
        )}

        {/* My Activities Section */}
        <div className="mt-8">
          <MyActivitiesSection />
        </div>
      </div>

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={isAddActivityModalOpen}
        onClose={() => setIsAddActivityModalOpen(false)}
      />
    </div>
  );
}
