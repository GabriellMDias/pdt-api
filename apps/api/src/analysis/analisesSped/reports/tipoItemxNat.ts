import { Registro0200, Registro0400, RegistroC170 } from "../../parsers/types";

export const TipoItemxNat = {
  code: "tipoItemxNat",
  description: "Tipo Item x Natureza",
  groupName: "Relatórios SPED",
  fields: [
    { name: "chave", description: "Chave NFE", order: 0, dataType: "string" },
    { name: "numDoc", description: "Num Doc", order: 1, dataType: "string" },
    { name: "codItem", description: "Cod. Item", order: 2, dataType: "string" },
    {
      name: "descrItem",
      description: "Descrição",
      order: 3,
      dataType: "string",
    },
    {
      name: "tipoItem",
      description: "Cód Tipo Item",
      order: 4,
      dataType: "string",
    },
    { name: "nat", description: "Natureza", order: 5, dataType: "string" },
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>,
    R0400: Map<string, Registro0400>,
  ) {
    const linhas: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        const it0200 = itens0200.get(item.COD_ITEM);
        const r0400 = R0400.get(item.COD_NAT);

        console.log("teste: ", it0200);

        linhas.push({
          chave,
          numDoc: nota.c100.NUM_DOC,
          codItem: item.COD_ITEM,
          descrItem: it0200?.DESCR_ITEM ?? "Descrição não encontrada",
          tipoItem: it0200?.TIPO_ITEM ?? "Tipo Item não encontrado",
          nat: r0400?.DESCR_NAT ?? "Natureza não encontrada",
        });
      }
    }

    return linhas;
  },
};
