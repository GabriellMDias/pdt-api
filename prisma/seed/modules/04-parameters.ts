import { ParameterScope, ParameterType } from "@prisma/client";
import { prisma } from "../helpers";

/** Cria/atualiza a definição (definition) — isso PODE atualizar descrição/tipo/escopo/grupo */
async function defParameter(
  code: string,
  description: string,
  type: ParameterType,
  scope: ParameterScope,
  groupId: number,
  stdValue: string
) {
    const parameter = await prisma.parameterDefinition.upsert({
      where: { code },
      update: { description, type, scope, groupId },
      create: { code, description, type, scope, groupId }
    });

    if(scope === ParameterScope.STORE) { /* Garante valor por loja apenas se NÃO existir. */
        const stores = await prisma.store.findMany({ select: { id: true } });
        const tenantKeys = stores.map(s => `STORE:${s.id}`);

        const existing = await prisma.parameterValue.findMany({
            where: { definitionId: parameter.id, tenantKey: { in: tenantKeys } },
            select: { tenantKey: true }
        });
        const existingSet = new Set(existing.map(e => e.tenantKey));

        const toCreate = stores
            .filter(s => !existingSet.has(`STORE:${s.id}`))
            .map(s => ({
            definitionId: parameter.id,
            storeId: s.id,
            tenantKey: `STORE:${s.id}`,
            value: stdValue
            }));

        if (toCreate.length) {
            await prisma.parameterValue.createMany({
            data: toCreate,
            skipDuplicates: true
            });
        }
    } else {/*Garante valor GLOBAL apenas se NÃO existir.*/
        const existing = await prisma.parameterValue.findUnique({
            where: { definitionId_tenantKey: { definitionId: parameter.id, tenantKey: "GLOBAL" } },
            select: { definitionId: true }
        });
        if (!existing) {
            await prisma.parameterValue.create({
            data: { definitionId: parameter.id, tenantKey: "GLOBAL", value: stdValue }
            });
        }
    }
}

export default async function seedParameters() {
  // Grupos
  const groupSankhya = await prisma.parameterGroup.upsert({
    where: { code: "sankhya" },
    update: {},
    create: {
      code: "sankhya",
      name: "Sankhya",
      description: "Parâmetros para integração com o ERP Sankhya"
    }
  });

  const groupVR = await prisma.parameterGroup.upsert({
    where: { code: "vr" },
    update: {},
    create: {
      code: "vr",
      name: "VR",
      description: "Parâmetros VR"
    }
  });

  const groupDRE = await prisma.parameterGroup.upsert({
    where: {code: 'dre'},
    update: {},
    create: {
      code: 'dre',
      name: 'DRE',
      description: "Parâmetros DRE"
    }
  })

  // Parâmetros API Sankhya
  await defParameter("sankhya.base_url", "URL base do Gateway/WS do Sankhya (API antiga Sankhya)", ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "https://sua-instancia-sankhya.exemplo.com.br");
  await defParameter("sankhya.port",     "Porta do serviço (API antiga Sankhya)",                   ParameterType.INT,    ParameterScope.GLOBAL, groupSankhya.id, "8080");
  await defParameter("sankhya.username", "Usuário de integração (API antiga Sankhya)",              ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "integracao");
  await defParameter("sankhya.password", "Senha do usuário de integração (API antiga Sankhya)",     ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "**trocar**");
  await defParameter("sankhya.client_id", "Identificador único da aplicação gerado na Área do Desenvolvedor.",     ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "client_id");
  await defParameter("sankhya.client_secret", "Segredo da aplicação gerado na Área do Desenvolvedor.",     ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "client_secret");
  await defParameter("sankhya.x-token", "Token obtido na tela Configurações Gateway do Sankhya Om.",     ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "x-token");
  await defParameter("sankhya.api_base_url", "URL base da API Sankhya.",     ParameterType.STRING, ParameterScope.GLOBAL, groupSankhya.id, "https://api.sankhya.com.br");


  await defParameter("vr.prest_serv", "CPF Prestadores de Serviço.", ParameterType.JSON, ParameterScope.GLOBAL, groupVR.id, `{"cpfs": ["12345678978", "23456789123"]}`);

  await defParameter("dre.prov_perda_secos", "Provisão de Perda Desconhecidas no Centro Custo Secos (% sobre o faturamento)", ParameterType.DECIMAL, ParameterScope.GLOBAL, groupDRE.id, "1")
  await defParameter("dre.considera_quebra_negativa", "Considera valores negativos na quebra, consumo e perda", ParameterType.BOOL, ParameterScope.BOTH, groupDRE.id, "true")
}
