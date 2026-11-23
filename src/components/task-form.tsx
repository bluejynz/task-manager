"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import { taskInputSchema } from "@/shared/task.schemas";
import { trpc, type TaskPage } from "@/trpc/client";

type EditableTask = Pick<TaskPage["items"][number], "id" | "titulo" | "descricao">;

export function TaskForm({ task }: { task?: EditableTask }) {
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const titleInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const router = useRouter();
  const notify = useToast();
  const create = trpc.task.create.useMutation();
  const update = trpc.task.update.useMutation();
  const pending = create.isPending || update.isPending || isNavigating;
  const error = create.error ?? update.error;
  const serverTitleError = error?.data?.zodError?.fieldErrors.titulo?.[0];
  const visibleTitleError = titleError ?? serverTitleError;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || pending) return;
    setTitleError(null);
    create.reset();
    update.reset();

    const parsed = taskInputSchema.safeParse({ titulo, descricao: descricao || undefined });
    if (!parsed.success) {
      setTitleError("Informe um título para a tarefa.");
      titleInput.current?.focus();
      return;
    }

    submitting.current = true;
    notify(null);
    try {
      // mutateAsync waits for the shared cache invalidation before leaving the form.
      if (task) await update.mutateAsync({ id: task.id, ...parsed.data });
      else await create.mutateAsync(parsed.data);
    } catch {
      // Mutation state retains typed API errors and the user's draft for retrying.
      return;
    } finally {
      submitting.current = false;
    }

    // The write can finish after the user has already navigated elsewhere.
    if (!mounted.current) return;
    notify({ type: "success", message: task ? "Tarefa atualizada." : "Tarefa criada." });
    startTransition(() => router.push("/"));
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8" aria-busy={pending}>
      {error && !serverTitleError && (
        <div role="alert" className="mb-6 rounded-xl border border-danger/20 bg-danger-soft p-4 text-base text-danger">
          {error.data?.code === "NOT_FOUND"
            ? "Esta tarefa foi excluída ou não existe mais. Seu texto foi mantido neste formulário."
            : "Não foi possível confirmar o salvamento. Verifique a lista antes de tentar novamente."}
        </div>
      )}
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
        <legend className="sr-only">Dados da tarefa</legend>
        <div>
          <label htmlFor="titulo" className="block text-sm font-semibold text-ink">Título <span className="font-normal text-muted">(obrigatório)</span></label>
          <input
            ref={titleInput}
            id="titulo"
            name="titulo"
            type="text"
            required
            value={titulo}
            onChange={(event) => { setTitulo(event.target.value); setTitleError(null); }}
            aria-invalid={Boolean(visibleTitleError)}
            aria-describedby={visibleTitleError ? "titulo-error" : undefined}
            className={`mt-2 w-full rounded-lg border bg-surface px-4 py-3 text-base text-ink ${visibleTitleError ? "border-danger" : "border-line"}`}
          />
          {visibleTitleError && <p id="titulo-error" role="alert" className="mt-2 text-sm text-danger">{visibleTitleError}</p>}
        </div>
        <div>
          <label htmlFor="descricao" className="block text-sm font-semibold text-ink">Descrição <span className="font-normal text-muted">(opcional)</span></label>
          <textarea
            id="descricao"
            name="descricao"
            rows={6}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-line bg-surface px-4 py-3 text-base leading-7 text-ink"
          />
        </div>
      </fieldset>
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">
          {pending ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
        </button>
        {pending ? <span className="px-4 py-3 text-sm text-muted">Aguarde o salvamento.</span> : (
          <Link href="/" prefetch={false} className="rounded-lg px-4 py-3 text-base font-semibold text-muted hover:bg-canvas hover:text-ink">Cancelar</Link>
        )}
      </div>
    </form>
  );
}
