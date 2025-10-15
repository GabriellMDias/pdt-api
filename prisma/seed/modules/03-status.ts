import { prisma } from "../helpers";

/** Status de análise — referência simples */
export default async function seedStatus() {
  const r = await prisma.statusAnalise.createMany({
    data: [
      { id: 0, descricao: "Erro" },
      { id: 1, descricao: "Processo Finalizado" },
      { id: 2, descricao: "Carregando..." }
    ],
    skipDuplicates: true
  });
  console.log(`• statusAnalise: inserted/skipped ${r.count}`);
}
