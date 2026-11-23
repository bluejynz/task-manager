import { TaskList } from "@/components/task-list";
import { api } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await api.task.list({ limit: 8, cursor: 0 });
  const fetchedAt = Date.now();

  return (
    <>
      <a href="#tasks" className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-4">Pular para as tarefas</a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-6">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">✓</span>
          <span className="font-heading text-lg font-bold tracking-tight">Task Manager</span>
        </div>
      </header>
      <main id="tasks" className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Seu espaço de trabalho</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Clareza para o que vem a seguir.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Uma tarefa de cada vez. Organize suas ideias e dê espaço ao trabalho que importa.</p>
        <TaskList initialData={initialData} fetchedAt={fetchedAt} />
      </main>
    </>
  );
}
