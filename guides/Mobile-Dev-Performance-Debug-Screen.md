# Mobile Dev Performance Debug Screen

## Como acessar

Em ambiente de desenvolvimento:

1. entre no app com um usuario autenticado
2. selecione a loja atual
3. abra `Configuracoes`
4. toque em `Abrir debug`

Rota principal:

- `/debug-performance`

Alias interno de compatibilidade em desenvolvimento:

- `/dev-seed`

## O que a tela faz

A tela centraliza testes de volume e transmissao para:

- ruptura
- troca
- consumo
- producao
- balanco

## Acoes disponiveis

### Seed

- gerar seed por rotina
- gerar seed para todas as rotinas
- escolher volume por rotina:
  - `10`
  - `100`
  - `500`
  - `2000`

### Limpeza

- limpar seed por rotina
- limpar todos os seeds

### Resumo de volume

Para cada rotina, a tela mostra:

- total local
- pendentes
- transmitidos
- em envio
- erros temporarios
- erros permanentes

Tambem existe um resumo geral somando todas as rotinas.

### Navegacao rapida

Cada card de rotina permite abrir rapidamente a tela correspondente:

- `/rupture`
- `/troca`
- `/consumo`
- `/producao`
- `/balanco`

### Teste de transmissao

Cada rotina possui botao `Transmitir`.

Esse botao reaproveita a infraestrutura real de outbox do app, filtrando por prefixo de evento da rotina. O painel mede:

- duracao
- quantidade de lotes
- quantidade de eventos
- processados
- conciliados
- erros temporarios
- erros permanentes

## Reaproveitamento da infraestrutura de seed

A tela nao duplica a logica de seed. Ela reaproveita:

- `generateLocalDevSeed`
- `generateAllLocalDevSeed`
- `clearLocalDevSeed`
- `clearAllLocalDevSeed`

alem da nova camada de contagem e transmissao:

- `getAllDevPerformanceCounts`
- `transmitDevPerformanceRoutine`

## Como foi garantido que isso so existe em desenvolvimento

As protecoes sao:

1. `DEV_LOCAL_SEED_ENABLED = !ENV.IS_PRODUCTION`
2. o card em `Configuracoes` so aparece quando a feature esta habilitada
3. a rota `/debug-performance` redireciona fora do ambiente permitido
4. a rota alias `/dev-seed` tambem redireciona
5. o `_layout` so registra essas telas quando o ambiente nao e de producao

## Metricas e feedback mostrados

A tela registra logs recentes com:

- acao executada
- detalhe do resultado
- horario
- duracao em ms ou s

As duracoes medidas automaticamente hoje sao:

- gerar seed
- limpar seed
- transmitir por rotina

Abrir a rotina fica disponivel para teste manual rapido de renderizacao e scroll.

## Como usar para testes de performance

1. sincronize a loja e os catalogos necessarios
2. abra `Debug de performance`
3. gere volume em uma rotina ou em todas
4. confira as contagens locais
5. abra rapidamente a rotina desejada
6. teste scroll, filtro, renderizacao e swipe
7. volte ao debug
8. dispare a transmissao da rotina
9. observe contagens, resultado e duracao
10. limpe os seeds quando terminar
