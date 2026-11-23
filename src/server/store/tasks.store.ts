import "server-only";

export type Task = {
  id: string;
  titulo: string;
  descricao: string | undefined;
  dataCriacao: number;
};

export type TaskInput = Pick<Task, "titulo"> & Partial<Pick<Task, "descricao">>;
export type TaskPage = { items: Task[]; nextCursor?: number; total: number };

const seedTitles = [
  "Revisar o planejamento da semana",
  "Preparar a apresentação do projeto Aurora",
  "Organizar o backlog do produto",
  "Atualizar a documentação de instalação",
  "Revisar os textos da página inicial",
  "Validar o formulário de contato",
  "Mapear melhorias de acessibilidade",
  "Preparar a pauta da reunião de produto",
  "Conferir o layout em dispositivos móveis",
  "Documentar os componentes da interface",
  "Revisar os critérios de aceite",
  "Organizar os arquivos de referência",
  "Planejar os testes de navegação",
  "Atualizar o guia de contribuição",
  "Consolidar o feedback da demonstração",
  "Definir a pauta da retrospectiva",
  "Revisar as mensagens de erro",
  "Preparar o checklist de entrega",
];

function createSeed(): Task[] {
  const now = Date.now();
  return seedTitles.map((titulo, index) => ({
    id: crypto.randomUUID(),
    titulo,
    descricao: index % 4 === 0 ? undefined : `Atividade de demonstração do projeto fictício Aurora: ${titulo.toLowerCase()}.`,
    dataCriacao: now - index * 3_600_000,
  }));
}

const globalStore = globalThis as typeof globalThis & { taskManagerTasks?: Task[] };

// Keep the same array across development HMR; restarting the process resets the data.
const tasks = (globalStore.taskManagerTasks ??= createSeed());

export const tasksStore = {
  list({ limit = 8, cursor = 0 }: { limit?: number; cursor?: number } = {}): TaskPage {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(cursor) || cursor < 0) {
      throw new RangeError("Pagination requires a positive limit and a non-negative cursor.");
    }
    const sorted = [...tasks].sort((a, b) => b.dataCriacao - a.dataCriacao);
    const items = sorted.slice(cursor, cursor + limit).map((task) => ({ ...task }));
    const nextCursor = cursor + items.length;
    return { items, nextCursor: nextCursor < tasks.length ? nextCursor : undefined, total: tasks.length };
  },
  byId(id: string): Task | undefined {
    const task = tasks.find((item) => item.id === id);
    return task ? { ...task } : undefined;
  },
  create(input: TaskInput): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: input.titulo,
      descricao: input.descricao,
      dataCriacao: Date.now(),
    };
    tasks.push(task);
    return { ...task };
  },
  update(id: string, input: TaskInput): Task | undefined {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return undefined;
    tasks[index] = { ...tasks[index], titulo: input.titulo, descricao: input.descricao };
    return { ...tasks[index] };
  },
  delete(id: string): boolean {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    return true;
  },
};
