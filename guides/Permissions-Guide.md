# Guia de Permissões — Front-End

Este guia explica rapidamente como **validar permissões no front** usando os dados fornecidos pela API.

---

## Conceitos

- **code**: identificador da permissão (ex.: `expense:editar`).
- **useStorePermission**: quando **true**, a permissão é **por loja**; quando **false**, é **global** (não depende de loja).
- **Global**: o usuário possui a permissão para **todas** as lojas. *(No backend isso significa `storeId = null`, mas você não precisa usar esse detalhe no front.)*

---

## O que a API retorna

1) **Catálogo de permissões** (para montar UI/menus):  
   Campos: `code`, `label`, `useStorePermission`.

2) **Permissões do usuário** (formato **enriquecido** recomendado para o front):  
   Para cada `code`:
   - `global: boolean` → tem em todas as lojas?
   - `stores: number[]` → lista de lojas onde possui a permissão (se não for global).
   - `useStorePermission: boolean` → espelha o catálogo.

> Se a API retornar **apenas** a lista de `code` sem lojas, você não conseguirá validar por loja no front. Prefira o formato enriquecido acima.

### Exemplos (ilustrativos)

**Catálogo**
```json
[
  { "code": "users:consultar", "label": "Consultar usuários", "useStorePermission": false },
  { "code": "expense:editar",  "label": "Editar Despesas",    "useStorePermission": true  }
]
```

**Permissões do usuário**
```json
{
  "userId": 42,
  "permissions": [
    { "code": "users:consultar", "global": true,  "stores": [],        "useStorePermission": false },
    { "code": "expense:editar",  "global": false, "stores": [1, 3, 5], "useStorePermission": true  }
  ]
}
```

---

## Como decidir no front (regra)

Para saber se o usuário pode executar a ação `code` na `storeId` atual:

1. Encontre a permissão pelo `code` nas permissões do usuário.
2. Se `useStorePermission` **for false** → **permitido** (independe de loja).
3. Se `useStorePermission` **for true** → **permitido** se:
   - `global === true`, **ou**
   - `stores.includes(storeIdAtual) === true`.

> **Admin (id = 0)**: se você tiver essa informação no front, pode optar por liberar tudo (bypass).

---

## Rotas da API (para o front)

**Headers obrigatórios (todas as rotas):**
```
Authorization: Bearer <token>
Content-Type: application/json
```

### 1) Listar catálogo de permissões
**GET** `api/permissions`  
**Requer permissão:** `permissions:consultar`

**Resposta 200**
```json
[
  { "id": 1, "code": "users:consultar", "label": "Consultar usuários", "useStorePermission": false },
  { "id": 9, "code": "expense:consultar", "label": "Consultar Despesas", "useStorePermission": true }
]
```

**Erros comuns**
- `401` sem token ou token inválido
- `403` sem a permissão `permissions:consultar`

---

### 2) Listar permissões do usuário
**GET** `api/permissions/:userId`  
**Requer permissão:** `permissions:consultar`

**Resposta 200 (formato enriquecido)**
```json
{
  "userId": 42,
  "permissions": [
    { "code": "users:consultar", "global": true,  "stores": [],        "useStorePermission": false },
    { "code": "expense:editar",  "global": false, "stores": [1, 3, 5], "useStorePermission": true  }
  ]
}
```

**Erros comuns**
- `401` sem token ou token inválido
- `403` sem a permissão `permissions:consultar`

> Use esta rota para montar o **mapa de permissões do usuário** que será usado pela checagem na UI.

---

### 3) Conceder / Revogar permissões
**PATCH** `api/permissions/:userId`  
**Requer permissão:** `permissions:editar`

**Body**
```json
{
  "permissionsCode": ["expense:consultar", "expense:editar"],
  "enable": true,
  "storeId": 3   // opcional: omita para conceder/revogar de forma GLOBAL
}
```

- `enable: true`  → concede a(s) permissão(ões) (global se `storeId` omitido; por loja se informado).
- `enable: false` → revoga a(s) permissão(ões) (global se `storeId` omitido; por loja se informado).

**Resposta 200 (formato enriquecido)**
```json
{
  "userId": 42,
  "permissions": [
    { "code": "users:consultar", "global": true,  "stores": [],        "useStorePermission": false },
    { "code": "expense:editar",  "global": false, "stores": [1, 3, 5], "useStorePermission": true  }
  ]
}
```

**Erros comuns**
- `401` sem token ou token inválido
- `403` sem a permissão `permissions:editar`
- `404` algum `permissionsCode` inexistente

---

## Boas práticas na UI

- Use a regra acima para **mostrar/ocultar** menus e **habilitar/desabilitar** botões.
- Em rotas protegidas, **bloqueie a navegação** se a checagem falhar.
- Reavalie permissões quando a **loja ativa** mudar.
- Se cachear permissões no front, **recarregue** após um `PATCH /permissions/:userId`.

---

## Checklist rápido

- [ ] Carregar o **catálogo** (`code`, `label`, `useStorePermission`).
- [ ] Carregar as **permissões do usuário** (formato **enriquecido**).
- [ ] Implementar checagem `code` + `storeId`.
- [ ] Atualizar a UI quando a **loja ativa** mudar.
- [ ] (Opcional) Tratar **admin** como bypass no front.
