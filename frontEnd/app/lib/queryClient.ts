"use client";

import { QueryClient } from "@tanstack/react-query";

let client: QueryClient | null = null;

export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 10 * 60 * 1000, // 10 minutes (shorter than 15min token lifetime)
        },
      },
    });
  }
  return client;
}
