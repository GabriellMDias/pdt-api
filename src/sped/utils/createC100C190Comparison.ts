import { RegistroC100, RegistroC170, RegistroC190 } from '../parsers/types';

export function createC100C190Comparison({
  code,
  description,
  fieldC100,
  fieldC190,
  label,
  groupName
}: {
  code: string;
  description: string;
  fieldC100: keyof RegistroC100;
  fieldC190: keyof RegistroC190;
  label: string;
  groupName: string;
}) {
  return {
    code,
    description,
    groupName,
    execute(notas: Map<string, {c100: RegistroC100; itens: RegistroC170[]; resumosC190: RegistroC190[];}>) {
      const erros: any[] = [];

      for (const [chave, nota] of notas.entries()) {
        if (!nota.resumosC190?.length) continue;

        // Soma os valores do campo C190
        const soma = nota.resumosC190.reduce((soma, resumo) => soma + (resumo[fieldC190] as number), 0);

        // Obtém o valor do C100
        const valorNota = nota.c100[fieldC100] as number;

        const diferenca = Math.abs(soma - valorNota);
        const arredondada = parseFloat(diferenca.toFixed(2));

        if (arredondada >= 0.01) {
          erros.push({
            chave,
            numDoc: nota.c100.NUM_DOC,
            codPart: nota.c100.COD_PART,
            [`${label}_C100`]: parseFloat(valorNota.toFixed(2)),
            [`soma_${label}_C190`]: parseFloat(soma.toFixed(2)),
            diferenca: arredondada,
          });
        }
      }

      return erros;
    },
  };
}
