import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage: string;
    const contentType = res.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || res.statusText;
      } else {
        const text = await res.text();
        errorMessage = text || res.statusText;
      }
    } catch (error) {
      errorMessage = res.statusText;
    }

    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  options: RequestInit = {}
) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for non-FormData requests
  if (!(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Ensure we're using the correct port (5000) for API requests
  let fullUrl = url;
  if (url.startsWith('/api')) {
    fullUrl = `http://localhost:5000${url}`;
    console.log(`Using full URL for API request: ${fullUrl}`);
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    credentials: 'include',
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    ...options,
  });

  // For file uploads and other non-JSON responses, return the response directly
  if (url.includes('/api/upload')) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Upload failed');
    }
    return response;
  }

  // For JSON responses, parse and handle errors
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }
    return response;
  }

  // For any other response type
  if (!response.ok) {
    throw new Error('Request failed');
  }
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      let url = queryKey[0] as string;

      // Ensure we're using the correct port (5000) for API requests
      if (url.startsWith('/api')) {
        url = `http://localhost:5000${url}`;
      }

      console.log(`Fetch request to: ${url}`);

      // Enhanced fetch with better headers
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          "Accept": "application/json"
        },
        credentials: "include", // Always include credentials for auth
      });

      // Log response status for debugging
      console.log(`Response from ${url}: ${res.status}`);

      // Handle unauthorized according to specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized request, returning null");
        return null;
      }

      await throwIfResNotOk(res);

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        throw new Error("Server returned non-JSON response");
      }
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on window focus for better user experience
      staleTime: 5 * 60 * 1000, // 5 minutes - a reasonable time for data to be considered fresh
      retry: 1, // Allow one retry for network issues
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Allow one retry for network issues
      retryDelay: 1000, // 1 second delay before retry
    },
  },
});
