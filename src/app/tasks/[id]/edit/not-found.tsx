import Link from "next/link";

export default function TaskNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-xl border border-line bg-surface p-8 sm:p-12">
        <h1 className="text-3xl font-bold">Tarefa não encontrada</h1>
        <p className="mt-4 text-base leading-7 text-muted">Ela pode ter sido excluída ou o endereço está incorreto.</p>
        <Link href="/" prefetch={false} className="mt-8 inline-block rounded-lg bg-primary px-5 py-3 text-base font-semibold text-white hover:bg-primary-hover">Voltar para tarefas</Link>
      </div>
    </main>
  );
}
