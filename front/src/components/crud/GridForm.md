# GridForm --- Guia Rápido

Componente genérico para CRUD com **Grade + Formulário**.

------------------------------------------------------------------------

## Uso Básico

``` tsx
<GridForm<T, TCreate, TUpdate>
  title="Cadastro de X"
  idOf={(row) => row.id}
  columns={[
    { key: "name", header: "Nome" },
    { key: "email", header: "E-mail" }
  ]}
  fetchAll={async () => ...}
  createItem={async (data) => ...}
  updateItem={async (id, data) => ...}
  deleteItem={async (id) => ...}
  renderForm={(props) => <MeuForm {...props} />}
  searchPlaceholder="Buscar..."
/>
```

------------------------------------------------------------------------

## Props principais

-   **title**: título da página.
-   **idOf(row)**: retorna o ID único do registro.
-   **columns**: colunas da tabela (`key`, `header`, `render?`).
-   **fetchAll(params)**: busca todos registros.
-   **createItem(data)**: cria registro.
-   **updateItem(id, data)**: atualiza registro.
-   **deleteItem(id)**: exclui registro.
-   **renderForm(args)**: renderiza formulário customizado.

------------------------------------------------------------------------

## renderForm --- args

-   **initial**: valores iniciais (ou vazio para novo).
-   **onCancel()**: volta para grade.
-   **onSubmit(payload, id?)**: salva ou atualiza.
-   **submitting**: booleano enquanto envia.
-   **isEdit**: true se edição.

------------------------------------------------------------------------

## Exemplo rápido (Usuários)

``` tsx
function UserForm({ initial, onCancel, onSubmit, submitting, isEdit }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ name, email }, initial?.id);
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">{isEdit ? "Salvar" : "Cadastrar"}</button>
      <button type="button" onClick={onCancel}>Cancelar</button>
    </form>
  );
}
```

------------------------------------------------------------------------

## Dicas

-   Use `renderForm` para criar o form específico da entidade.
-   Troque apenas `columns` + funções de API para reutilizar.
-   Pode começar no modo formulário com `initialMode="form"`.
