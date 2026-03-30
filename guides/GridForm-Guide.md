# GridForm Guide

Guia curto para o componente reutilizavel [GridForm.tsx](../apps/web/src/components/crud/GridForm.tsx), usado nos CRUDs do `apps/web`.

## Quando usar

Use `GridForm` quando a pagina tiver:

- listagem com selecao de linha
- formulario de criacao ou edicao na mesma tela
- busca local por texto
- acoes padrao de criar, editar e excluir
- acoes extras por linha via `actionsForRow`, quando necessario

## Exemplo basico

```tsx
<GridForm<User, CreateUserDto, UpdateUserDto>
  title="Usuarios"
  idOf={(row) => row.id}
  columns={[
    { key: "name", header: "Nome" },
    { key: "email", header: "E-mail" },
  ]}
  fetchAll={fetchUsers}
  createItem={createUser}
  updateItem={updateUser}
  deleteItem={deleteUser}
  renderForm={({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }) => (
    <UserForm
      initial={initial}
      isEdit={isEdit}
      maySubmit={maySubmit}
      submitting={submitting}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )}
  searchPlaceholder="Buscar usuario"
/>
```

## Props principais

- `title`: titulo da pagina.
- `idOf(row)`: retorna o ID unico do registro.
- `columns`: colunas da grade (`key`, `header`, `width?`, `render?`).
- `fetchAll({ search })`: carrega os registros.
- `createItem(data)`: cria um registro.
- `updateItem(id, data)`: atualiza um registro.
- `deleteItem(id)`: exclui um registro.
- `renderForm(args)`: renderiza o formulario customizado.
- `initialMode`: inicia em `grid` ou `form`.
- `canCreate`, `canEdit`, `canDelete`: gates de permissao globais ou por linha.
- `actionsForRow`: acoes extras exibidas no botao `Acoes`.

## `renderForm(args)`

O `renderForm` recebe:

- `initial`: valores iniciais da linha selecionada, ou `undefined` para criacao.
- `onCancel()`: volta para a grade.
- `onSubmit(payload, id?)`: salva ou atualiza.
- `submitting`: indica envio em andamento.
- `isEdit`: `true` quando ha linha selecionada para edicao.
- `maySubmit`: indica se a acao atual esta permitida pelos gates do componente.

## Comportamento util

- Busca com debounce simples no carregamento.
- Selecao de linha com clique e edicao com duplo clique.
- Toolbar padrao para incluir, excluir e navegar entre registros.
- Dropdown de `Acoes` opcional para fluxos complementares.

## Regra pratica

Se a pagina e um CRUD padrao com grade + formulario, prefira `GridForm` antes de criar um fluxo novo do zero.
