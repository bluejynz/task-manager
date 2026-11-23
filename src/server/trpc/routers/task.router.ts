import { TRPCError } from "@trpc/server";
import { tasksStore } from "@/server/store/tasks.store";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";
import { taskIdSchema, taskInputSchema, taskListSchema, taskUpdateSchema } from "@/shared/task.schemas";

export const taskRouter = createTRPCRouter({
  list: publicProcedure.input(taskListSchema).query(({ input }) => tasksStore.list(input)),

  byId: publicProcedure.input(taskIdSchema).query(({ input }) => {
    const task = tasksStore.byId(input.id);
    if (!task) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
    }
    return task;
  }),

  create: publicProcedure.input(taskInputSchema).mutation(({ input }) => tasksStore.create(input)),

  update: publicProcedure.input(taskUpdateSchema).mutation(({ input }) => {
    const task = tasksStore.update(input.id, input);
    if (!task) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Task not found for update." });
    }
    return task;
  }),

  delete: publicProcedure.input(taskIdSchema).mutation(({ input }) => {
    if (!tasksStore.delete(input.id)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Task not found for deletion." });
    }
    return { id: input.id };
  }),
});
