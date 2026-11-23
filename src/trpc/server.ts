import "server-only";
import { createCaller } from "@/server/trpc/root";

// Server Components can call the validated API directly, without a local HTTP request.
export const api = createCaller({});
