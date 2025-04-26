import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse the error response as JSON
      const contentType = res.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        const jsonResponse = await res.json();
        
        // Extract the message from the JSON response
        const errorMessage = jsonResponse.message || jsonResponse.error || JSON.stringify(jsonResponse);
        throw new Error(errorMessage);
      } else {
        // For non-JSON responses, use text content
        const text = await res.text() || res.statusText;
        throw new Error(text || `Error ${res.status}: Request failed`);
      }
    } catch (jsonError) {
      // If JSON parsing fails, throw the original error
      if (jsonError instanceof Error && jsonError.message) {
        throw jsonError;
      } else {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
    }
  }
}

export async function apiRequest<T = any>(
  urlOrOptions: string | RequestInit,
  optionsOrData?: RequestInit | unknown,
): Promise<T> {
  let url: string;
  let options: RequestInit = {};
  
  // Handle different parameter patterns
  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
    
    if (optionsOrData && typeof optionsOrData === 'object' && !Array.isArray(optionsOrData)) {
      if ('method' in optionsOrData || 'headers' in optionsOrData || 'body' in optionsOrData) {
        // It's a RequestInit object
        options = optionsOrData as RequestInit;
      } else {
        // It's data to be sent in the body with POST
        options = {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(optionsOrData),
        };
      }
    }
  } else {
    throw new Error('First parameter must be a URL string');
  }
  
  // Set default credentials
  if (!options.credentials) {
    options.credentials = 'include';
  }
  
  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  
  // Parse the response as JSON and return it as type T
  return await res.json() as T;
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
