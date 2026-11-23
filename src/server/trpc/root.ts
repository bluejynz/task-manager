import "server-only";
import { taskRouter } from "@/server/trpc/routers/task.router";
import { createCallerFactory, createTRPCRouter } from "@/server/trpc/trpc";

export const appRouter = createTRPCRouter({ task: taskRouter });
export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
