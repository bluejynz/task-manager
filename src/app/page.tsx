import { tasksStore } from "@/server/store/tasks.store";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default function HomePage() {
  // Initial preview of the store. The next milestones add tRPC and interactive pagination.
  const { items, total } = tasksStore.list();

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
        <section aria-labelledby="task-heading" className="mt-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="task-heading" className="text-2xl font-bold">Tarefas <span className="ml-2 text-lg font-medium text-muted">{total}</span></h2>
            <span className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted">Prévia inicial · dados fictícios</span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((task) => (
              <li key={task.id} className="flex flex-col rounded-xl border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold leading-7">{task.titulo}</h3>
                <p className="mt-3 flex-1 text-base leading-7 text-muted">{task.descricao ?? "Sem descrição."}</p>
                <time dateTime={new Date(task.dataCriacao).toISOString()} className="mt-6 border-t border-line pt-4 text-sm text-muted">{dateFormat.format(task.dataCriacao)}</time>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">Exibindo {items.length} de {total} tarefas. Criação, edição, exclusão e rolagem infinita serão adicionadas nas próximas etapas.</p>
        </section>
      </main>
    </>
  );
}
