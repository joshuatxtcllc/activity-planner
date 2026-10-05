/**
 * Load the Google Maps JavaScript API once per page, using the official
 * async bootstrap (loading=async + callback) so google.maps.importLibrary
 * is available afterwards.
 */
let loading: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const cb = "__activityPlannerMapsReady";
    (window as any)[cb] = () => {
      delete (window as any)[cb];
      resolve();
    };
    // Google calls this on auth failures (bad key, referrer not allowed).
    (window as any).gm_authFailure = () => reject(new Error("Google Maps rejected the API key"));

    const params = new URLSearchParams({ key: apiKey, v: "weekly", loading: "async", callback: cb });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
