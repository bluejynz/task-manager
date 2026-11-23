"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/task-form";
import { taskDetailOptions, trpc, type Task } from "@/trpc/client";

export function EditTaskForm({ initialTask }: { initialTask: Task }) {
  const task = trpc.task.byId.useQuery({ id: initialTask.id }, taskDetailOptions(initialTask));
  const [verifiedTask, setVerifiedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!verifiedTask && task.isFetchedAfterMount && task.isSuccess) {
      // Capture one verified snapshot. Later cache updates must not replace a draft.
      setVerifiedTask(task.data);
    }
  }, [verifiedTask, task.isFetchedAfterMount, task.isSuccess, task.data]);

  if (verifiedTask) return <TaskForm task={verifiedTask} />;

  if (task.isError && !task.isFetching) {
    const missing = task.error.data?.code === "NOT_FOUND";
    return (
      <div role="alert" className="mt-8 rounded-xl border border-danger/20 bg-danger-soft p-6 text-base text-danger">
        <p>{missing ? "Esta tarefa foi excluída ou não existe mais." : "Não foi possível carregar os dados atuais. Tente novamente antes de editar."}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {!missing && <button type="button" onClick={() => { void task.refetch(); }} className="rounded font-semibold underline underline-offset-4">Tentar novamente</button>}
          <Link href="/" prefetch={false} className="rounded font-semibold underline underline-offset-4">Voltar para tarefas</Link>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="mt-8 rounded-xl border border-line bg-surface p-8 text-base text-muted">
      Conferindo os dados atuais da tarefa…
    </div>
  );
}
