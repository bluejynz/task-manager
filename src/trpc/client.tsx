"use client";

import { matchMutation, MutationCache, QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact, getQueryKey } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useState, type ReactNode } from "react";
import type { AppRouter } from "@/server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();
export type TaskPage = inferRouterOutputs<AppRouter>["task"]["list"];
export const taskMutationFilter = { mutationKey: getQueryKey(trpc.task) };

export function selectTaskPages<TPageParam>(data: InfiniteData<TaskPage, TPageParam>) {
  const needsRefresh = data.pages.some((page) => page.revision !== data.pages[0]?.revision);
  // Never render a mixture of offsets from different versions of the task list.
  return {
    ...data,
    pages: needsRefresh ? data.pages.slice(0, 1) : data.pages,
    pageParams: needsRefresh ? data.pageParams.slice(0, 1) : data.pageParams,
    needsRefresh,
  };
}

export function taskListOptions(initialData: TaskPage, fetchedAt: number) {
  return {
    initialData: { pages: [initialData], pageParams: [0] },
    initialDataUpdatedAt: fetchedAt,
    getNextPageParam: (page: TaskPage) => page.nextCursor,
    select: selectTaskPages,
    // Compare revisions, not server/browser clocks. Matching SSR data needs no GET.
    refetchOnMount: (query: { state: { isInvalidated: boolean; data: InfiniteData<TaskPage> | undefined } }): "always" | false => (
      query.state.isInvalidated || query.state.data?.pages.some((page) => page.revision !== initialData.revision)
        ? "always"
        : false
    ),
  };
}

export function createQueryClient(): QueryClient {
  const taskQueries = { queryKey: getQueryKey(trpc.task) };
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 0, retry: 1 } },
    mutationCache: new MutationCache({
      onMutate: (_variables, mutation) => {
        if (matchMutation(taskMutationFilter, mutation)) return queryClient.cancelQueries(taskQueries);
      },
      // Infinite queries refetch sequentially from page one, recalculating offsets.
      // Run after failures too: a lost response may still have changed server data.
      onSettled: (_data, _error, _variables, _context, mutation) => {
        if (matchMutation(taskMutationFilter, mutation)) return queryClient.invalidateQueries(taskQueries);
      },
    }),
  });
  return queryClient;
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  // Per-render-tree clients prevent sharing query caches between SSR requests.
  const [queryClient] = useState(createQueryClient);
  const [client] = useState(() => trpc.createClient({
    links: [httpBatchLink({ url: "/api/trpc" })],
  }));

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
