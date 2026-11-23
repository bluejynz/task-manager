import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import { GET, POST } from "@/app/api/trpc/[trpc]/route";
import { createCaller, type AppRouter } from "@/server/trpc/root";
import { tasksStore } from "@/server/store/tasks.store";
import { api } from "@/trpc/server";

const caller = createCaller({});

function hasError(code: TRPCError["code"], message?: string) {
  return (error: unknown) => error instanceof TRPCError
    && error.code === code
    && (message === undefined || error.message === message);
}

// Exercise the real HTTP adapter in process, without a running development server.
const client = createTRPCClient<AppRouter>({
  links: [httpLink({
    url: "http://localhost/api/trpc",
    fetch: (url, options) => {
      const request = new Request(url, options);
      return request.method === "GET" ? GET(request) : POST(request);
    },
  })],
});

describe("task API", () => {
  it("paginates the seed without duplicates and sorts newest first", async () => {
    const first = await api.task.list();
    assert.equal(first.total, 18);
    assert.equal(first.items.length, 8);
    assert.equal(first.nextCursor, 8);
    const second = await caller.task.list({ cursor: first.nextCursor });
    const last = await caller.task.list({ cursor: second.nextCursor });
    assert.equal(last.nextCursor, undefined);
    const items = [...first.items, ...second.items, ...last.items];
    assert.equal(new Set(items.map((task) => task.id)).size, first.total);
    assert.ok(items.every((task, index) => index === 0 || items[index - 1].dataCriacao >= task.dataCriacao));
    assert.deepEqual((await caller.task.list({ cursor: 999 })).items, []);
  });

  it("rejects invalid pagination instead of silently adjusting it", async () => {
    for (const input of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { cursor: -1 }, { cursor: 0.5 }]) {
      await assert.rejects(caller.task.list(input), hasError("BAD_REQUEST"));
    }
  });

  it("rejects whitespace-only titles on creation and update without changing state", async () => {
    const before = await caller.task.list();
    await assert.rejects(caller.task.create({ titulo: " \n\t " }), hasError("BAD_REQUEST"));
    const existing = before.items[0];
    await assert.rejects(caller.task.update({ id: existing.id, titulo: "   " }), hasError("BAD_REQUEST"));
    assert.deepEqual(await caller.task.byId({ id: existing.id }), existing);
    assert.equal((await caller.task.list()).total, before.total);
    assert.equal((await caller.task.list()).revision, before.revision);
  });

  it("trims titles, accepts omitted descriptions, and generates identity on the server", async () => {
    const input = { titulo: "  Test task  ", id: crypto.randomUUID(), dataCriacao: 0 };
    const started = Date.now();
    const task = await caller.task.create(input);
    try {
      assert.equal(task.titulo, "Test task");
      assert.equal(task.descricao, undefined);
      assert.notEqual(task.id, input.id);
      assert.ok(task.dataCriacao >= started);
      const updated = await caller.task.update({ id: task.id, titulo: "  Updated  ", descricao: "Details" });
      assert.equal(updated.titulo, "Updated");
      assert.equal(updated.descricao, "Details");
      assert.equal(updated.id, task.id);
      assert.equal(updated.dataCriacao, task.dataCriacao);
      const withoutDescription = await caller.task.update({ id: task.id, titulo: "Updated" });
      assert.equal(withoutDescription.descricao, undefined);
    } finally {
      await caller.task.delete({ id: task.id });
    }
  });

  it("returns the required NOT_FOUND messages for missing UUIDs", async () => {
    const id = crypto.randomUUID();
    await assert.rejects(caller.task.byId({ id }), hasError("NOT_FOUND", "Task not found."));
    await assert.rejects(caller.task.update({ id, titulo: "Missing" }), hasError("NOT_FOUND", "Task not found for update."));
    await assert.rejects(caller.task.delete({ id }), hasError("NOT_FOUND", "Task not found for deletion."));
  });

  it("rejects malformed UUIDs", async () => {
    await assert.rejects(caller.task.byId({ id: "invalid" }), hasError("BAD_REQUEST"));
    await assert.rejects(caller.task.delete({ id: "" }), hasError("BAD_REQUEST"));
  });

  it("changes the list revision only on successful writes", async () => {
    const before = (await caller.task.list()).revision;
    const task = await caller.task.create({ titulo: "Revision test" });
    try {
      const created = (await caller.task.list()).revision;
      assert.notEqual(created, before);
      await caller.task.update({ id: task.id, titulo: "Updated revision" });
      const updated = (await caller.task.list()).revision;
      assert.notEqual(updated, created);
      assert.equal((await caller.task.list()).revision, updated);
    } finally {
      const beforeDelete = (await caller.task.list()).revision;
      await caller.task.delete({ id: task.id });
      const afterDelete = (await caller.task.list()).revision;
      assert.notEqual(afterDelete, beforeDelete);
      await assert.rejects(caller.task.delete({ id: task.id }), hasError("NOT_FOUND"));
      assert.equal((await caller.task.list()).revision, afterDelete);
    }
  });

  it("keeps callers from mutating the store through returned objects", async () => {
    const first = (await caller.task.list()).items[0];
    const originalTitle = first.titulo;
    first.titulo = "External mutation";
    assert.equal((await caller.task.byId({ id: first.id })).titulo, originalTitle);
    const found = await caller.task.byId({ id: first.id });
    found.titulo = "Another mutation";
    assert.equal(tasksStore.byId(first.id)?.titulo, originalTitle);
  });

  it("supports a full CRUD round trip through the HTTP adapter", async () => {
    const before = await client.task.list.query();
    const task = await client.task.create.mutate({ titulo: "  HTTP task  ", descricao: "Details" });
    let deleted = false;
    try {
      assert.equal(task.titulo, "HTTP task");
      assert.equal((await client.task.list.query()).total, before.total + 1);
      assert.equal((await client.task.byId.query({ id: task.id })).id, task.id);
      assert.equal((await client.task.update.mutate({ id: task.id, titulo: "HTTP updated" })).titulo, "HTTP updated");
      assert.deepEqual(await client.task.delete.mutate({ id: task.id }), { id: task.id });
      deleted = true;
      await assert.rejects(client.task.byId.query({ id: task.id }), (error: unknown) => (
        error instanceof TRPCClientError && error.data?.code === "NOT_FOUND" && error.data?.httpStatus === 404
      ));
      assert.equal((await client.task.list.query()).total, before.total);
    } finally {
      if (!deleted) await caller.task.delete({ id: task.id });
    }
  });

  it("exposes field validation errors and disables HTTP caching", async () => {
    await assert.rejects(client.task.create.mutate({ titulo: "   " }), (error: unknown) => (
      error instanceof TRPCClientError
      && error.data?.httpStatus === 400
      && error.data?.zodError?.fieldErrors?.titulo?.includes("Title is required")
    ));
    const response = await GET(new Request("http://localhost/api/trpc/task.list"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const wrongMethod = await GET(new Request("http://localhost/api/trpc/task.create"));
    assert.equal(wrongMethod.status, 405);
  });
});
