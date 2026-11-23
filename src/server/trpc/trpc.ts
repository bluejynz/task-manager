import "server-only";
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    const zodError: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } | null = (
      error.cause instanceof z.ZodError ? z.flattenError(error.cause) : null
    );
    return {
      ...shape,
      data: {
        ...shape.data,
        // Field errors can be shown by forms without parsing an error message.
        zodError,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
