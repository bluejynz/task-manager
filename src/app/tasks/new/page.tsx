import type { Metadata } from "next";
import Link from "next/link";
import { TaskForm } from "@/components/task-form";

export const metadata: Metadata = { title: "Nova tarefa | Task Manager" };

export default function NewTaskPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link href="/" prefetch={false} className="inline-block rounded text-sm font-semibold text-muted hover:text-primary">Voltar para tarefas</Link>
      <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Nova tarefa</h1>
      <p className="mt-3 text-base leading-7 text-muted">Dê um título à sua próxima tarefa e acrescente os detalhes que precisar.</p>
      <TaskForm />
    </main>
  );
}
