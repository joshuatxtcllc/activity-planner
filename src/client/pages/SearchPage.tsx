import { useEffect } from "react";

export default function SearchPage() {
  useEffect(() => {
    // Load Google Custom Search script if not already loaded
    const existingScript = document.querySelector('script[src*="cse.google.com"]');

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cse.google.com/cse.js?cx=f2b75eab46b0040c9';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Search Houston Events
        </h2>
        <p className="text-gray-600">
          Search for events, activities, and things to do in Houston
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="gcse-search"></div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-900 font-semibold mb-2">Search Tips</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Try searching for specific event types like "concerts", "festivals", or "food events"</li>
          <li>• Include dates or days of the week for more specific results</li>
          <li>• Search for neighborhoods like "downtown Houston" or "Montrose"</li>
          <li>• Look for free events or activities within your budget</li>
        </ul>
      </div>
    </div>
  );
}
