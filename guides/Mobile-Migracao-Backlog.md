# Mobile Migracao Backlog

## Objetivo
Backlog incremental para migracao do app mobile legado para `apps/mobile`, com foco em execucao assistida por IA e dependencias claras.

## Premissas
- Nao reescrever o login atual sem erro real.
- Nao consumir `apps/mobile_old/mobile_backend` no app novo.
- Nao fazer mudancas invasivas no VRMaster quando o schema auxiliar `pdtconnect` resolver.
- Priorizar pequenas entregas com validacao por fase.

## Visao geral das fases
| Fase | Objetivo | Dependencias de entrada | Saida esperada |
| --- | --- | --- | --- |
| Fundacao | Criar base estrutural do novo app | Estado atual de auth | Shell, contexto de loja, schema local expandido e componentes base |
| Sync | Habilitar dados offline e transmissao resiliente | Fundacao | Catalogos por loja, outbox, idempotencia e contratos de sync |
| Feature 1 | Migrar primeira feature operacional menor | Fundacao + Sync | Primeira rotina funcional no novo app |
| Feature 2 | Migrar a feature que consolida transmissao resiliente | Feature 1 + Sync | Caso completo com chunking/idempotencia |
| Refino visual | Aproximar app novo do web | Fundacao minima pronta | UI consistente com identidade oficial |
| Distribuicao/update | Definir como o app sera entregue e atualizado | App funcional minimo | Estrategia de release e update homologada |

## Fase 1. Fundacao

### Objetivo
Transformar o app novo de um fluxo de autenticacao isolado em uma base operacional pronta para receber features.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| FND-01 | Definir shell de navegacao do novo mobile (home real, menu, areas autenticadas) | Nenhuma | Migrar telas sem shell padrao gera retrabalho de navegacao. |
| FND-02 | Criar migracao SQLite v2 com namespaces `catalog_*`, `op_*` e `sync_*` | Nenhuma | Portar schema antigo literalmente carrega divida tecnica e ambiguidade. |
| FND-03 | Modelar sessao multiusuario e escopo de loja no SQLite | FND-02 | Sem escopo por usuario, a troca de loja/usuario pode corromper cache local. |
| FND-04 | Criar componentes base alinhados ao `apps/web` (`button`, `input`, `card`, `modal`, `list item`, `badge`) | Nenhuma | Migrar feature antes do kit visual aumenta divergencia de UI. |
| FND-05 | Definir servico reutilizavel de scanner/busca de produto | FND-02 | Cada feature tende a duplicar logica de lookup se isso nao vier antes. |
| FND-06 | Definir contrato de permissao local consumido do sync de usuarios | Estado atual de auth | Sem isso, a navegacao pode exibir features indevidas. |

### Checklist de aceite
- Usuario autenticado entra em um shell real do app.
- O app suporta armazenar contexto de usuario e loja sem quebrar o login atual.
- O schema local novo e versionado e extensivel.
- Existe base visual alinhada ao guia `Identidade-Visual-Mobile.md`.

## Fase 2. Sync

### Objetivo
Habilitar sincronizacao offline-first por loja e transmissao resiliente sem duplicar processamento.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| SYN-01 | Criar endpoints mobile-ready para catalogos operacionais na API nova | FND-02, FND-03 | Reusar endpoints web paginados como catalogo offline tende a falhar em volume e contrato. |
| SYN-02 | Implementar sincronizacao por dominio (`stores`, `products`, `recipes`, `balancos`, `tipos`) | SYN-01 | Sync monolitico estilo legado impede evolucao incremental. |
| SYN-03 | Persistir estado de sync por loja/dominio (`sync_state`) | SYN-02 | Sem checkpoint por dominio, qualquer erro obriga reload completo. |
| SYN-04 | Criar `sync_outbox` unica no mobile com retry, backoff e observabilidade | FND-02 | Repetir logica de transmissao em cada tela gera bugs divergentes. |
| SYN-05 | Criar tabela `pdtconnect.api_idempotency` e middleware/servico de replay na API nova | SYN-04 | Timeout e reenvio podem duplicar processamento no backend. |
| SYN-06 | Padronizar contratos de resposta parcial/sucesso/falha para o mobile | SYN-05 | Sem contrato uniforme, o app nao sabe marcar itens transmitidos corretamente. |
| SYN-07 | Definir estrategia de identificacao do dispositivo no app novo | FND-03 | Hardcodes de `ipTerminal` e `idUser` do legado nao podem voltar. |

### Checklist de aceite
- Catalogos essenciais da loja ficam offline.
- O app consegue retomar transmissao apos queda de internet.
- Reenvio de payload nao duplica efeito no backend.
- Cada dominio possui estado de sync observavel.

## Fase 3. Feature 1

### Recomendacao
Migrar `Ruptura` primeiro.

### Justificativa
- E a menor feature operacional do legado.
- Tem payload simples agrupado por prateleira.
- Exerce fluxo completo de catalogo, coleta local, outbox e transmissao.
- Ja existe no `apps/web` uma feature relacionada (`Atualizar Prateleiras`) que ajuda a fechar o contexto de negocio.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| FEAT1-01 | Criar tabelas locais de ruptura (`op_ruptura_items` ou equivalente) | FND-02, SYN-02 | Sem persistencia clara nao ha suporte offline real. |
| FEAT1-02 | Implementar tela de listagem/transmissao de ruptura | FND-01, FND-04, SYN-04 | Tentar migrar direto a tela de coleta sem lista de pendencias reduz observabilidade. |
| FEAT1-03 | Implementar tela de coleta por prateleira com lookup de produto | FND-05, SYN-02 | Scanner e busca tendem a ser gargalo de UX. |
| FEAT1-04 | Criar endpoint novo de ingestao de ruptura na API | SYN-05, SYN-06 | O endpoint atual `POST /ruptura/atualizar-prateleira` nao substitui a coleta do mobile. |
| FEAT1-05 | Definir como a coleta de ruptura alimenta o processo administrativo posterior | FEAT1-04 | Sem essa definicao, a feature para no meio do fluxo de negocio. |

### Checklist de aceite
- Usuario coleta ruptura offline.
- Pendencias ficam visiveis localmente.
- Transmissao agrupa itens por prateleira.
- Backend novo recebe sem usar o backend legado.

## Fase 4. Feature 2

### Recomendacao
Migrar `Balanco` na segunda feature.

### Justificativa
- E o caso mais forte de resiliencia do legado.
- Ja possui no legado ordenacao estavel, chunking e idempotencia.
- Serve como molde para consumo, troca e producao.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| FEAT2-01 | Sincronizar catalogo de balancos por loja | SYN-01, SYN-02 | Sem isso a feature nao tem contexto operacional. |
| FEAT2-02 | Modelar dados locais de balanco e itens coletados | FND-02 | Balanco precisa separar cabecalho, itens e status de transmissao. |
| FEAT2-03 | Implementar telas `lista`, `lancamento` e `itens por balanco` | FND-01, FND-04, FND-05 | Migrar apenas uma das telas quebra o fluxo real do legado. |
| FEAT2-04 | Criar endpoint idempotente de envio de balanco na API nova | SYN-05, SYN-06 | Balanco e o caso em que duplicidade mais facilmente aparece. |
| FEAT2-05 | Implementar ack parcial e marcacao local de itens aceitos | FEAT2-04 | Sem ack parcial, o app perde rastreabilidade ao falhar parcialmente. |

### Checklist de aceite
- Usuario coleta itens de balanco offline.
- O app transmite em lotes com chave de idempotencia.
- Reenvio apos timeout nao duplica registro.
- O app marca localmente apenas os itens aceitos.

## Fase 5. Refino visual

### Objetivo
Aproximar `apps/mobile` da linguagem visual de `apps/web` sem quebrar usabilidade operacional.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| VIS-01 | Ajustar shell mobile para refletir sidebar/topbar/cartoes do web em linguagem mobile | FND-01, FND-04 | Migrar features antes do shell visual aumenta retrabalho. |
| VIS-02 | Padronizar feedbacks (`warning`, `error`, `loading`, `chips`, `pending`) | FND-04 | Operacao offline sem feedback claro gera erro humano. |
| VIS-03 | Criar listas operacionais reutilizaveis no lugar do `TransmissionList` legado | FND-04 | Reaproveitar o visual antigo literal quebra a identidade nova. |
| VIS-04 | Alinhar tipografia, espacamento, modais e interacoes ao guia visual | Nenhuma | Divergencia visual entre web e mobile dificulta manutencao. |
| VIS-05 | Revisar performance em Android baixo e leitura em ambiente de loja | Feature 1 e Feature 2 | UI bonita mas lenta inviabiliza uso operacional. |

### Checklist de aceite
- Tema dark e o padrao.
- Cores, modais e cards seguem o guia oficial.
- O app fica consistente em login, home e features operacionais.

## Fase 6. Distribuicao/update

### Objetivo
Substituir o modelo legado de update por APK servido pelo backend antigo por uma estrategia suportavel no novo stack.

### Itens
| ID | Item | Dependencias | Risco tecnico |
| --- | --- | --- | --- |
| DIST-01 | Definir modelo de distribuicao (`EAS Update`, APK interno, MDM ou outra estrategia) | Fundacao minima pronta | Tentar copiar `rn-update-apk` do legado pode conflitar com a arquitetura nova. |
| DIST-02 | Definir versionamento e canal de release | DIST-01 | Sem canais, nao ha rollout controlado. |
| DIST-03 | Implementar UX de update compativel com operacao em loja | DIST-01 | Update intrusivo durante operacao pode gerar indisponibilidade. |
| DIST-04 | Definir rollback e build reproducivel | DIST-01 | Sem rollback, qualquer release ruim paralisa lojas. |

### Checklist de aceite
- Existe estrategia oficial de distribuicao.
- O app pode ser atualizado sem depender do backend legado.
- O processo de release e rollback esta documentado.

## Dependencias cruzadas entre features
- `scanner/busca de produto` e dependencia compartilhada de `ruptura`, `balanco`, `consumo` e `troca`.
- `recipes` e dependencia exclusiva de `producao`.
- `balancos` sincronizados por loja sao dependencia exclusiva de `balanco`.
- `sync_outbox` e `api_idempotency` sao prerequisitos de qualquer feature que transmita dados operacionais.
- `store context` por usuario e prerequisito de todos os catalogos e de toda coleta offline.

## Principais riscos tecnicos
- Reusar consultas web como catalogo mobile sem contrato especifico.
- Tentar portar o backend legado para a API nova sem separar regra de negocio de escrita no ERP.
- Misturar estado global de loja com multiusuario local.
- Reimplementar transmissao por feature em vez de centralizar em uma outbox.
- Postergar definicao de distribuicao/update e depois ficar preso ao fluxo antigo de APK.

## Ordem recomendada apos este backlog
1. Fundacao
2. Sync
3. Ruptura
4. Balanco
5. Consumo / Troca
6. Producao
7. Refino visual
8. Distribuicao/update
