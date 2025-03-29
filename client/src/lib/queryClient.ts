import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Custom fetch for mock API endpoints
const customFetch = async (url: string, config: RequestInit = {}) => {
  // Check if this is a mock API call (not a real API endpoint)
  if (url.startsWith('aggregatedActivities')) {
    // This will be handled by our mock activityService
    return { ok: true, json: () => Promise.resolve([]) };
  }
  
  // For real API calls, use the standard fetch
  return fetch(url, config);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Handle the first item in the queryKey as the endpoint
        const endpoint = queryKey[0];
        
        // For mock endpoints handled by our services
        if (typeof endpoint === 'string' && (
          endpoint === 'aggregatedActivities' ||
          endpoint.startsWith('aggregatedActivities/')
        )) {
          return null; // Let the service handle this
        }
        
        // For real API endpoints
        const res = await fetch(endpoint as string, {
          credentials: 'include',
        });
        
        // Handle errors
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          
          const text = (await res.text()) || res.statusText;
          throw new Error(`${res.status}: ${text}`);
        }
        
        return await res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
