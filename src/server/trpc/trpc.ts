import "server-only";
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Field errors can be shown by forms without parsing an error message.
        zodError: error.cause instanceof z.ZodError ? z.flattenError(error.cause) : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
