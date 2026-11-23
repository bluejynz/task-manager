"use client";

import { useIsMutating } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useToast, type ToastMessage } from "@/components/toast";
import { taskListOptions, taskMutationFilter, trpc, type TaskPage } from "@/trpc/client";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function TaskCard({ task, onFeedback }: {
  task: TaskPage["items"][number];
  onFeedback: (feedback: ToastMessage | null) => void;
}) {
  // Each card owns its mutation, so only the selected task shows a loading state.
  const deletion = trpc.task.delete.useMutation({
    onMutate: () => onFeedback(null),
    onSuccess: () => onFeedback({ type: "success", message: "Tarefa excluída." }),
    onError: (error) => onFeedback({
      type: "error",
      message: error.data?.code === "NOT_FOUND"
        ? "Esta tarefa já foi removida."
        : "Não foi possível confirmar a exclusão. Verifique a lista antes de tentar novamente.",
    }),
  });

  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-6" aria-busy={deletion.isPending}>
      <h3 className="break-words text-lg font-semibold leading-7">{task.titulo}</h3>
      <p className="mt-3 flex-1 whitespace-pre-wrap break-words text-base leading-7 text-muted">{task.descricao || "Sem descrição."}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <time dateTime={new Date(task.dataCriacao).toISOString()} className="text-sm text-muted">{dateFormat.format(task.dataCriacao)}</time>
        <div className="flex items-center gap-1">
          <Link
            href={`/tasks/${task.id}/edit`}
            prefetch={false}
            aria-label={`Editar ${task.titulo}`}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
          >Editar</Link>
          <button
            type="button"
            disabled={deletion.isPending}
            onClick={() => deletion.mutate({ id: task.id })}
            aria-label={`${deletion.isPending ? "Excluindo" : "Excluir"} ${task.titulo}`}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft disabled:cursor-wait disabled:opacity-60"
          >
            {deletion.isPending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </li>
  );
}

export function TaskList({ initialData, fetchedAt }: { initialData: TaskPage; fetchedAt: number }) {
  const notify = useToast();
  const sentinel = useRef<HTMLDivElement>(null);
  const mutations = useIsMutating(taskMutationFilter);
  const list = trpc.task.list.useInfiniteQuery({ limit: 8 }, {
    initialCursor: 0,
    // SSR supplies the exact first page used to render and hydrate the client list.
    ...taskListOptions(initialData, fetchedAt),
  });
  const { fetchNextPage, hasNextPage, isFetching, isError } = list;
  const needsRefresh = list.data.needsRefresh;

  useEffect(() => {
    // Another client changed the array between pages. Re-read from offset zero.
    if (needsRefresh && !isFetching && !isError && mutations === 0) void list.refetch();
  }, [needsRefresh, isFetching, isError, mutations, list.refetch]);

  useEffect(() => {
    if (!sentinel.current || !hasNextPage || isFetching || isError || needsRefresh || mutations > 0) return;
    if (!("IntersectionObserver" in window)) return;
    // Stop pagination during writes/refetches so an old offset cannot race a mutation.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void fetchNextPage({ cancelRefetch: false });
    }, { rootMargin: "160px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, isError, needsRefresh, mutations]);

  const items = list.data.pages.flatMap((page) => page.items);
  const total = list.data.pages[0].total;

  return (
    <section aria-labelledby="task-heading" className="mt-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="task-heading" className="text-2xl font-bold">Tarefas <span className="ml-2 text-lg font-medium text-muted">{total}</span></h2>
        <Link href="/tasks/new" prefetch={false} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">Nova tarefa</Link>
      </div>
      {needsRefresh && <p role="status" className="mb-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">As tarefas mudaram durante a navegação. Atualizando a lista…</p>}
      {list.isError && (
        <div role="alert" className="mb-4 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
          <p>{list.isFetchNextPageError ? "Não foi possível carregar mais tarefas." : "Não foi possível atualizar a lista. Os dados exibidos podem estar desatualizados."}</p>
          <button
            type="button"
            disabled={isFetching || mutations > 0}
            onClick={() => { void (list.isFetchNextPageError ? fetchNextPage({ cancelRefetch: false }) : list.refetch()); }}
            className="mt-2 rounded font-semibold underline underline-offset-4 disabled:opacity-60"
          >Tentar novamente</button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <h3 className="text-xl font-semibold">Nenhuma tarefa por aqui.</h3>
          <p className="mt-3 text-base text-muted">Suas tarefas aparecerão neste espaço.</p>
          <Link href="/tasks/new" prefetch={false} className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Criar primeira tarefa</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((task) => <TaskCard key={task.id} task={task} onFeedback={notify} />)}
        </ul>
      )}
      <div ref={sentinel} className="mt-6 flex min-h-16 flex-col items-center gap-3 text-center text-sm text-muted">
        <p role="status">
          {isFetching ? (list.isFetchingNextPage ? "Carregando mais tarefas…" : "Atualizando tarefas…") : `Exibindo ${items.length} de ${total} tarefas.`}
        </p>
        {hasNextPage ? (
          <button
            type="button"
            disabled={isFetching || mutations > 0 || isError || needsRefresh}
            onClick={() => { void fetchNextPage({ cancelRefetch: false }); }}
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >Carregar mais tarefas</button>
        ) : !isFetching && !needsRefresh && <p>Você chegou ao fim da lista.</p>}
      </div>
    </section>
  );
}
