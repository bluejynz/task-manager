import { z } from "zod";

// Shared with the future task form so browser and API use the same title rules.
export const taskInputSchema = z.object({
  titulo: z.string().trim().min(1, "Title is required"),
  descricao: z.string().optional(),
});

export const taskIdSchema = z.object({ id: z.uuid("Invalid task ID") });

export const taskUpdateSchema = taskInputSchema.extend(taskIdSchema.shape);

export const taskListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(8),
  cursor: z.number().int().min(0).optional(),
}).optional();
