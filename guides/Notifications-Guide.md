# Notifications Guide

Este documento descreve o sistema de notificações criado para ser reaproveitado em outras funcionalidades.

## Visão geral
O sistema foi projetado para:
- Registrar notificações reutilizáveis (tipo, título, mensagem e dados auxiliares em JSON).
- Atribuir notificações a múltiplos usuários (recipients).
- Permitir marcar notificações como lidas/não lidas.

## Estrutura de dados (Prisma)
Foram adicionados dois modelos:

- `Notification`: armazena os dados da notificação (tipo, título, mensagem, dados opcionais e data de criação).
- `NotificationRecipient`: vincula a notificação a usuários e controla o status de leitura (`readAt`).

Relacionamentos:
- Um `Notification` possui vários `NotificationRecipient`.
- Um `User` possui vários `NotificationRecipient`.

## API disponível
Todas as rotas estão em `/api/notifications` e exigem autenticação JWT.

### Buscar notificações do usuário atual
`GET /api/notifications/me`

Retorna a lista de notificações atribuídas ao usuário autenticado, ordenadas por data de criação.

### Marcar como lida/não lida
`PATCH /api/notifications/:notificationId/read`

Body:
```json
{ "read": true }
```

### Criar notificação
`POST /api/notifications`

Body:
```json
{
  "type": "cost-center-type.created",
  "title": "Novo tipo de centro de custo criado",
  "message": "Um novo tipo de centro de custo foi criado e precisa de rateio configurado.",
  "data": { "costCenterTypeId": 123 },
  "userIds": [1, 2, 3]
}
```

## Notificação para tipos de centro de custo
Ao criar um novo tipo de centro de custo, o backend dispara automaticamente uma notificação do tipo
`cost-center-type.created`. Os destinatários são:
- Usuário administrador (id = 0), caso exista.
- Usuários que possuem a permissão `cost-center-types:rateio`.

Isso permite alertar quem deve configurar o rateio sem acoplamento direto a uma tela específica.

## Como reutilizar
1. Crie um novo método no `NotificationsService` para encapsular o tipo da notificação desejada.
2. Chame esse método no serviço que dispara o evento (ex.: criação de registros, falhas em jobs, etc.).
3. Opcional: estenda o payload `data` com informações adicionais para a UI.

## Próximos passos sugeridos
- Criar uma tela no frontend para listar e marcar notificações como lidas.
- Adicionar badge com contagem de não lidas.
- Criar templates de mensagens para padronizar comunicações.
