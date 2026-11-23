import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    // The same in-memory tasks serve SSR and HTTP; responses must not be cached.
    responseMeta: () => ({ headers: { "cache-control": "no-store" } }),
  });
}

export { handler as GET, handler as POST };
