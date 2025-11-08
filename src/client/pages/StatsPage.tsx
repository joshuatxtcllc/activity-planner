import { useQuery } from "@tanstack/react-query";

interface Stats {
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  freeEvents: number;
}

async function fetchStats(): Promise<Stats> {
  const response = await fetch("/api/stats");
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Event Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Events" value={stats?.total || 0} />
        <StatCard title="Free Events" value={stats?.freeEvents || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Source</h3>
          {stats?.bySource && (
            <div className="space-y-2">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div key={source} className="flex justify-between items-center">
                  <span className="text-gray-700 capitalize">{source}</span>
                  <span className="text-gray-900 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
          {stats?.byCategory && (
            <div className="space-y-2">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-gray-700 capitalize">{category}</span>
                  <span className="text-gray-900 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
