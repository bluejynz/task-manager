import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InfiniteQueryObserver } from "@tanstack/react-query";
import { getMutationKey, getQueryKey } from "@trpc/react-query";
import { createQueryClient, taskListOptions, trpc, type TaskPage } from "@/trpc/client";

function fixture() {
  let revision = 0;
  let tasks: TaskPage["items"] = Array.from({ length: 18 }, (_, index) => ({
    id: `task-${index}`,
    titulo: `Task ${index}`,
    descricao: undefined,
    dataCriacao: 100 - index,
  }));
  const requests: number[] = [];
  const page = (cursor: number): TaskPage => ({
    items: tasks.slice(cursor, cursor + 8),
    total: tasks.length,
    nextCursor: cursor + 8 < tasks.length ? cursor + 8 : undefined,
    revision: `revision-${revision}`,
  });
  const queryClient = createQueryClient();
  const options = {
    queryKey: getQueryKey(trpc.task.list, { limit: 8 }, "infinite"),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      requests.push(pageParam);
      return page(pageParam);
    },
    ...taskListOptions(page(0), Date.now()),
    // Keep the SSR page fresh to prove that invalidation, not time, triggers refetch.
    staleTime: Infinity,
  };
  const observer = new InfiniteQueryObserver(queryClient, options);
  const unsubscribe = observer.subscribe(() => {});
  const mutate = (mutationFn: () => Promise<void>) => queryClient.getMutationCache()
    .build(queryClient, { mutationFn, mutationKey: getMutationKey(trpc.task.delete) }).execute(undefined);

  return {
    queryClient, observer, requests, options, mutate, page,
    tasks: () => tasks,
    replaceTasks: (next: TaskPage["items"]) => { tasks = next; revision++; },
    close: () => { unsubscribe(); queryClient.clear(); },
  };
}

describe("task list cache", () => {
  it("recalculates every loaded offset after deletion, including the old page boundary", async () => {
    const f = fixture();
    try {
      await f.observer.fetchNextPage();
      await f.observer.fetchNextPage();
      f.requests.length = 0;
      const removedId = f.tasks()[0].id;
      await f.mutate(async () => f.replaceTasks(f.tasks().filter((task) => task.id !== removedId)));

      assert.deepEqual(f.requests, [0, 8, 16]);
      const pages = f.observer.getCurrentResult().data!.pages;
      const ids = pages.flatMap((p) => p.items.map((task) => task.id));
      assert.deepEqual(ids, f.tasks().map((task) => task.id));
      assert.equal(new Set(ids).size, 17);
      assert.ok(pages.every((p) => p.total === 17));
      assert.equal(f.observer.getCurrentResult().hasNextPage, false);
    } finally {
      f.close();
    }
  });

  it("refetches after creation before continuing pagination, without duplicate rows", async () => {
    const f = fixture();
    try {
      await f.observer.fetchNextPage();
      f.requests.length = 0;
      await f.mutate(async () => f.replaceTasks([
        { id: "new", titulo: "New task", dataCriacao: 101 },
        ...f.tasks(),
      ]));
      assert.deepEqual(f.requests, [0, 8]);
      await f.observer.fetchNextPage();
      const ids = f.observer.getCurrentResult().data!.pages.flatMap((p) => p.items.map((task) => task.id));
      assert.deepEqual(ids, f.tasks().map((task) => task.id));
      assert.equal(new Set(ids).size, 19);
    } finally {
      f.close();
    }
  });

  it("reconciles the cache even if a write succeeds but its response is lost", async () => {
    const f = fixture();
    try {
      await assert.rejects(f.mutate(async () => {
        f.replaceTasks([]);
        throw new Error("Response lost");
      }), /Response lost/);
      const result = f.observer.getCurrentResult();
      assert.deepEqual(result.data!.pages[0].items, []);
      assert.equal(result.data!.pages[0].total, 0);
      assert.equal(result.hasNextPage, false);
    } finally {
      f.close();
    }
  });

  it("marks inactive lists stale so returning to a route refetches instead of keeping old SSR data", async () => {
    const f = fixture();
    f.observer.destroy();
    try {
      await f.mutate(async () => f.replaceTasks([]));
      assert.equal(f.queryClient.getQueryState(f.options.queryKey)?.isInvalidated, true);
      const returning = new InfiniteQueryObserver(f.queryClient, f.options);
      try {
        await new Promise<void>((resolve) => {
          const unsubscribe = returning.subscribe((result) => {
            if (result.isSuccess && !result.isFetching && result.data.pages[0].total === 0) {
              unsubscribe();
              resolve();
            }
          });
        });
        assert.equal(returning.getCurrentResult().data!.pages[0].total, 0);
      } finally {
        returning.destroy();
      }
    } finally {
      f.close();
    }
  });

  it("does not refetch the fresh SSR page immediately on mount", async () => {
    const f = fixture();
    f.observer.destroy();
    const observer = new InfiniteQueryObserver(f.queryClient, { ...f.options, staleTime: 0 });
    const unsubscribe = observer.subscribe(() => {});
    try {
      await Promise.resolve();
      assert.deepEqual(f.requests, []);
      assert.equal(observer.getCurrentResult().isFetching, false);
    } finally {
      unsubscribe();
      f.close();
    }
  });

  it("keeps a matching SSR revision without refetching just because its timestamp changed", async () => {
    const f = fixture();
    f.observer.destroy();
    const returning = new InfiniteQueryObserver(f.queryClient, {
      ...f.options,
      ...taskListOptions(f.page(0), f.options.initialDataUpdatedAt + 60_000),
      staleTime: 0,
    });
    const unsubscribe = returning.subscribe(() => {});
    try {
      await Promise.resolve();
      assert.deepEqual(f.requests, []);
      assert.equal(returning.getCurrentResult().isFetching, false);
    } finally {
      unsubscribe();
      returning.destroy();
      f.close();
    }
  });

  for (const clockOffset of [-60_000, 60_000]) {
    it(`revalidates a different SSR revision with client clock offset ${clockOffset}ms`, { timeout: 2_000 }, async () => {
      const f = fixture();
      f.observer.destroy();
      f.replaceTasks([]);
      f.queryClient.setQueryData(f.options.queryKey, (data) => data, { updatedAt: Date.now() + clockOffset });
      const returning = new InfiniteQueryObserver(f.queryClient, {
        ...f.options,
        ...taskListOptions(f.page(0), Date.now()),
      });
      try {
        await new Promise<void>((resolve) => {
          const unsubscribe = returning.subscribe((result) => {
            if (!result.isFetching && result.data?.pages[0].total === 0) {
              unsubscribe();
              resolve();
            }
          });
        });
        assert.deepEqual(f.requests, [0]);
        assert.equal(returning.getCurrentResult().data!.pages[0].revision, f.page(0).revision);
      } finally {
        returning.destroy();
        f.close();
      }
    });
  }

  it("does not invalidate task queries for an unrelated mutation", async () => {
    const f = fixture();
    try {
      await f.queryClient.getMutationCache().build(f.queryClient, {
        mutationKey: [["notes", "create"]],
        mutationFn: async () => undefined,
      }).execute(undefined);
      assert.deepEqual(f.requests, []);
      assert.equal(f.queryClient.getQueryState(f.options.queryKey)?.isInvalidated, false);
    } finally {
      f.close();
    }
  });

  for (const change of ["delete", "replace"] as const) {
    it(`detects an external ${change} between pages before rendering mixed offsets`, async () => {
      const f = fixture();
      try {
        const remaining = f.tasks().slice(1);
        f.replaceTasks(change === "delete" ? remaining : [
          { id: "external", titulo: "External task", dataCriacao: 101 }, ...remaining,
        ]);
        // Simulate another tab: no mutation runs in this query client's cache.
        await f.observer.fetchNextPage();
        const mixed = f.observer.getCurrentResult().data!;
        assert.equal(mixed.needsRefresh, true);
        assert.equal(mixed.pages.length, 1);
        // TaskList reacts to needsRefresh by refetching the loaded pages from zero.
        await f.observer.refetch();
        while (f.observer.getCurrentResult().hasNextPage) await f.observer.fetchNextPage();
        const data = f.observer.getCurrentResult().data!;
        assert.equal(data.needsRefresh, false);
        const ids = data.pages.flatMap((p) => p.items.map((task) => task.id));
        assert.deepEqual(ids, f.tasks().map((task) => task.id));
        assert.equal(new Set(ids).size, f.tasks().length);
      } finally {
        f.close();
      }
    });
  }
});
