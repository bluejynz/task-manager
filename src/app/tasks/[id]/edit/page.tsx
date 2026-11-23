import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { EditTaskForm } from "@/components/edit-task-form";
import { taskIdSchema } from "@/shared/task.schemas";
import { api } from "@/trpc/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar tarefa | Task Manager" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const input = taskIdSchema.safeParse(await params);
  if (!input.success) notFound();

  const task = await api.task.byId(input.data).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link href="/" prefetch={false} className="inline-block rounded text-sm font-semibold text-muted hover:text-primary">Voltar para tarefas</Link>
      <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Editar tarefa</h1>
      <p className="mt-3 text-base leading-7 text-muted">Atualize o título e os detalhes da tarefa.</p>
      <EditTaskForm key={task.id} initialTask={task} />
    </main>
  );
}
