import { TaskList } from "@/components/task-list";
import { api } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await api.task.list({ limit: 8, cursor: 0 });
  const fetchedAt = Date.now();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Seu espaço de trabalho</p>
      <h1 className="text-4xl font-bold sm:text-5xl">Clareza para o que vem a seguir.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Uma tarefa de cada vez. Organize suas ideias e dê espaço ao trabalho que importa.</p>
      <TaskList initialData={initialData} fetchedAt={fetchedAt} />
    </main>
  );
}
