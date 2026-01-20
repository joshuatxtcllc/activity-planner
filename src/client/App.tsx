import { Route, Switch } from "wouter";
import { useState } from "react";
import EventsPage from "./pages/EventsPage";
import StatsPage from "./pages/StatsPage";
import ItineraryPlannerPage from "./pages/ItineraryPlannerPage";
import CuratorPage from "./pages/CuratorPage";
import SearchPage from "./pages/SearchPage";
import ChatbotWidget from "./components/ChatbotWidget";

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-indigo-600">
                Houston Events
              </h1>
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-4">
                <a
                  href="/"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  This Weekend
                </a>
                <a
                  href="/curator"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  🎯 Activity Curator
                </a>
                <a
                  href="/planner"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  AI Planner
                </a>
                <a
                  href="/search"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Search
                </a>
                <a
                  href="/stats"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Stats
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-500">
                Auto-updated every Friday
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-2 border-t">
              <div className="flex flex-col space-y-1">
                <a
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  This Weekend
                </a>
                <a
                  href="/curator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  🎯 Activity Curator
                </a>
                <a
                  href="/planner"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  AI Planner
                </a>
                <a
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  Search
                </a>
                <a
                  href="/stats"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  Stats
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      <Switch>
        <Route path="/" component={EventsPage} />
        <Route path="/curator" component={CuratorPage} />
        <Route path="/planner" component={ItineraryPlannerPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/stats" component={StatsPage} />
      </Switch>

      {/* Chatbot Widget - Appears on all pages */}
      <ChatbotWidget />
    </div>
  );
}
