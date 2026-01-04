import { Route, Switch } from "wouter";
import EventsPage from "./pages/EventsPage";
import StatsPage from "./pages/StatsPage";
import ItineraryPlannerPage from "./pages/ItineraryPlannerPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-indigo-600">
                Houston Events
              </h1>
              <div className="hidden md:flex space-x-4">
                <a
                  href="/"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  This Weekend
                </a>
                <a
                  href="/planner"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  AI Planner
                </a>
                <a
                  href="/stats"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Stats
                </a>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Auto-updated every Friday
            </div>
          </div>
        </div>
      </nav>

      <Switch>
        <Route path="/" component={EventsPage} />
        <Route path="/planner" component={ItineraryPlannerPage} />
        <Route path="/stats" component={StatsPage} />
      </Switch>
    </div>
  );
}
