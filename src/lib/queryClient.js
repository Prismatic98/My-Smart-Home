import { QueryClient } from '@tanstack/react-query';

/**
 * Ein einziger QueryClient für die ganze App.
 * Die Defaults sind auf "läuft zuhause im eigenen Netz" ausgelegt:
 * eher wenig Refetching, dafür robuste Retries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});