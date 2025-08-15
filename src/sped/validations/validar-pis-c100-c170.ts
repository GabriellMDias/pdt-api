import { RegistroC100, RegistroC170 } from '../parsers/types';

export function validarPisC100xC170(
  notas: Map<string, { c100: RegistroC100; itens: RegistroC170[] }>
) {
  const erros: any[] = [];

  for (const [chave, nota] of notas.entries()) {
    if (!nota.itens.length) continue;

    const somaPis = nota.itens.reduce((soma, item) => soma + item.VL_PIS, 0);
    const valorPisNota = nota.c100.VL_PIS;

    const diferenca = Math.abs(somaPis - valorPisNota);
    const diferencaArredondada = parseFloat(diferenca.toFixed(2));

    if (diferencaArredondada >= 0.01) {
      erros.push({
        chave,
        numDoc: nota.c100.NUM_DOC,
        codPart: nota.c100.COD_PART,
        valorC100: parseFloat(valorPisNota.toFixed(2)),
        somaC170: parseFloat(somaPis.toFixed(2)),
        diferenca: diferencaArredondada
      });
    }
  }

  return erros;
}

