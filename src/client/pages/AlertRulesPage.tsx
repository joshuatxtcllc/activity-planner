import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// The `AlertRule` shape is what /api/alert-rules returns.
type AlertRule = {
  id: string;
  name: string;
  keywords: string[];
  venues: string[];
  categories: string[];
  sources: string[];
  channelEmail: boolean;
  channelSms: boolean;
  channelInApp: boolean;
  emailTo: string | null;
  smsTo: string | null;
  isActive: boolean;
  lastFiredAt: string | null;
  totalFired: number;
};

async function listRules(): Promise<AlertRule[]> {
  const r = await fetch("/api/alert-rules");
  if (!r.ok) throw new Error("Failed to load alert rules");
  return r.json();
}

const CATEGORY_OPTIONS = [
  { label: "Live music", value: "music" },
  { label: "Comedy", value: "comedy" },
  { label: "Sports", value: "sports" },
  { label: "Game night (bingo/trivia)", value: "game_night" },
  { label: "Arts", value: "arts" },
];

const VENUE_OPTIONS = ["Toyota Center", "House of Blues", "713 Music Hall", "Houston Improv"];

const CHANNEL_TIP = "Uncheck a channel to stop that delivery method for this rule.";

export default function AlertRulesPage() {
  const qc = useQueryClient();
  const { data: rules = [], isLoading } = useQuery({ queryKey: ["alert-rules"], queryFn: listRules });

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [emailTo, setEmailTo] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(false);
  const [channelInApp, setChannelInApp] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        keywords: keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        venues: selectedVenues,
        categories: selectedCategories,
        emailTo: emailTo || null,
        smsTo: smsTo || null,
        channelEmail,
        channelSms,
        channelInApp,
      };
      const r = await fetch("/api/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to create rule");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-rules"] });
      setName("");
      setKeywords("");
      setSelectedVenues([]);
      setSelectedCategories([]);
      setEmailTo("");
      setSmsTo("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/alert-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!r.ok) throw new Error("Failed to update rule");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/alert-rules/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete rule");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-bold text-gray-900">Nightlife alerts</h2>
      <p className="mt-2 text-gray-600">
        Get notified when a new event matches your interests. Rules combine dimensions with AND
        (e.g. venue AND category) and match with OR inside each list.
      </p>

      {/* Create-rule form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 my-8 space-y-4">
        <h3 className="text-lg font-semibold">Create a new rule</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            placeholder="e.g. Live music at HOB"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
          <input
            type="text"
            placeholder="bingo, trivia, karaoke"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venues</label>
            <div className="space-y-1">
              {VENUE_OPTIONS.map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedVenues.includes(v)}
                    onChange={(e) =>
                      setSelectedVenues((prev) =>
                        e.target.checked ? [...prev, v] : prev.filter((x) => x !== v)
                      )
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
            <div className="space-y-1">
              {CATEGORY_OPTIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c.value)}
                    onChange={(e) =>
                      setSelectedCategories((prev) =>
                        e.target.checked ? [...prev, c.value] : prev.filter((x) => x !== c.value)
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email to (optional)</label>
            <input
              type="email"
              placeholder="you@example.com — falls back to NOTIFICATION_EMAIL"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMS to (optional)</label>
            <input
              type="tel"
              placeholder="+17135551212 — falls back to NOTIFICATION_SMS"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" title={CHANNEL_TIP}>
            Delivery channels
          </label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={channelSms} onChange={(e) => setChannelSms(e.target.checked)} />
              SMS
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={channelInApp} onChange={(e) => setChannelInApp(e.target.checked)} />
              In-app
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!name || createMutation.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {createMutation.isPending ? "Saving…" : "Save rule"}
        </button>
      </div>

      {/* Existing rules */}
      <h3 className="text-xl font-semibold mb-3">Your rules</h3>
      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-gray-500">No rules yet. Create one above to get alerts.</p>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => (
            <li key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {r.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {r.keywords?.length ? `Keywords: ${r.keywords.join(", ")}` : ""}
                  {r.venues?.length ? ` · Venues: ${r.venues.join(", ")}` : ""}
                  {r.categories?.length ? ` · Categories: ${r.categories.join(", ")}` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Channels: {[
                    r.channelEmail && "email",
                    r.channelSms && "sms",
                    r.channelInApp && "in-app",
                  ]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  · Fired {r.totalFired ?? 0} time{r.totalFired === 1 ? "" : "s"}
                  {r.lastFiredAt ? ` (last ${new Date(r.lastFiredAt).toLocaleDateString()})` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toggleMutation.mutate({ id: r.id, isActive: !r.isActive })}
                  className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
                >
                  {r.isActive ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete rule "${r.name}"?`)) deleteMutation.mutate(r.id);
                  }}
                  className="text-sm px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
