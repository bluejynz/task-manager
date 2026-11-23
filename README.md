# Task Manager

Aplicação de gerenciamento de tarefas com Next.js 15 (App Router), React 19, TypeScript, tRPC, Zod, TanStack Query e Tailwind CSS. Interface em português, com criação, listagem, edição e exclusão de tarefas.

## Executar localmente

Use Node.js 22 ou 24 LTS e npm. O projeto foi validado com Node.js 24.

```sh
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Nenhuma variável de ambiente, credencial ou banco de dados é necessário. A instalação precisa de acesso ao npm; a compilação também pode precisar de acesso ao Google Fonts para baixar Inter e Plus Jakarta Sans via `next/font/google`.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload. |
| `npm test` | Testes automatizados da API e do cache. |
| `npm run typecheck` | Verificação de TypeScript estrito. |
| `npm run build` | Compilação de produção. |
| `npm start` | Executa a compilação de produção. |

## Funcionalidades

- Listagem renderizada no servidor, com primeira página de oito tarefas no HTML.
- Rolagem infinita, botão alternativo de carregamento, estados de erro e fim da lista.
- Formulário compartilhado para criação e edição, com título obrigatório após remover espaços nas extremidades e descrição opcional.
- Validação no navegador e na API; estados de envio e preservação do formulário quando ocorre um erro.
- Exclusão diretamente nos cards e notificações em toast. Sucessos fecham automaticamente e pausam com mouse/foco; erros permanecem até serem fechados.
- Tratamento de tarefa inexistente na página de edição.
- Layout responsivo, rótulos acessíveis, navegação por teclado e foco visível.

## Rotas

| Rota | Conteúdo |
| --- | --- |
| `/` | Listagem de tarefas. |
| `/tasks/new` | Criação de tarefa. |
| `/tasks/[id]/edit` | Edição de uma tarefa existente. |
| `/api/trpc/[trpc]` | Endpoint tRPC para GET e POST. |

## Arquitetura e fluxo de dados

```text
src/app/                 Páginas, layout e adaptador HTTP do tRPC
src/components/          Listagem, formulário compartilhado e toast
src/shared/              Schemas Zod reutilizados na interface e na API
src/server/store/        Repositório em memória com dados fictícios
src/server/trpc/         Inicialização, roteadores e caller tipado
src/trpc/                Provider React Query e caller do servidor
tests/                   Testes da API e da sincronização do cache
```

As páginas do servidor chamam o mesmo router tRPC usado pelo navegador, sem fazer uma requisição HTTP para a própria aplicação. A listagem passa os dados iniciais ao componente interativo. UUIDs e datas de criação são gerados no servidor.

No navegador, o formulário valida os dados com Zod e executa a mutation correspondente. O cache cancela consultas antigas e invalida as consultas de tarefas após a operação, inclusive quando uma resposta pode ter se perdido. O formulário aguarda essa etapa, mostra o toast e volta para a lista. O provider de notificações fica no layout, preservando a mensagem durante a navegação.

A edição confirma os dados atuais via `task.byId` antes de liberar o formulário, inclusive quando o botão Voltar do navegador restaura um snapshot antigo do servidor. Depois dessa confirmação, atualizações do cache não substituem o rascunho em andamento. Se a consulta falhar ou a tarefa tiver sido removida, a interface bloqueia a edição e informa o problema.

A paginação usa offset numérico e uma revisão da lista. Quando páginas pertencem a revisões diferentes, a interface não as mistura: refaz a consulta desde a primeira página. A revisão também identifica divergências entre SSR e cache sem comparar os relógios do navegador e do servidor.

O projeto mantém uma estrutura pequena: sem biblioteca de formulários, estado global externo, autenticação, ORM ou banco de dados.

## Armazenamento e limitações

- O servidor inicia com 18 tarefas inteiramente fictícias.
- O array e sua revisão ficam em `globalThis`, preservados durante o hot reload do desenvolvimento.
- Reiniciar o processo restaura os dados iniciais. Os dados não são persistidos em disco.
- Cada processo/instância mantém sua própria memória. A demonstração pressupõe uma instância do servidor; não oferece consistência entre réplicas ou funções serverless isoladas.
- Alterações de outras abas são detectadas em novas consultas; não há sincronização em tempo real.
- Não há autenticação ou separação por usuário: todas as pessoas conectadas à mesma instância acessam as mesmas tarefas. Use apenas dados fictícios nesta demonstração.

## Validação

Os testes usam o executor nativo do Node.js e `tsx`. O comando executa a suíte do servidor com a condição `react-server`, necessária para importar módulos protegidos por `server-only`, e depois a suíte do cliente com React normal.

São cobertos CRUD pelo caller e pelo adaptador HTTP, validação, erros 400/404, paginação, cópias defensivas, revisões de dados e invalidação de cache após criar, editar e excluir. Também há regressões para alterações entre páginas, resposta perdida após escrita, retorno à página e relógios diferentes entre cliente e servidor.

Os testes automatizados não controlam um navegador real. Para verificar a interface, crie uma tarefa, edite seu título e descrição, retorne à lista e exclua-a. Confira os toasts, tente enviar um título contendo apenas espaços, teste um endereço de edição inexistente e valide a navegação por teclado em uma tela estreita.
