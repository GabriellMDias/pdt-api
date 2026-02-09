import { RegistroC100, RegistroC170, RegistroC190 } from '../parsers/types';

/**
 * Cria uma função de análise entre campos do registro C100 e C170.
 * Essa função pode ser reutilizada para diferentes tipos de validação (ex: PIS, COFINS, etc.).
 *
 * @param code - Código único da análise (usado no banco)
 * @param description - Descrição legível da análise
 * @param fieldC100 - Campo do C100 que será comparado
 * @param fieldC170 - Campo do C170 que será somado
 * @param label - Nome legível para o campo analisado (usado nas chaves do objeto de erro)
 */
export function createC100C170Comparison({
  code,
  description,
  fieldC100,
  fieldC170,
  label,
  groupName
}: {
  code: string;
  description: string;
  fieldC100: keyof RegistroC100;
  fieldC170: keyof RegistroC170;
  label: string;
  groupName: string;
}) {
  return {
    code,
    description,
    groupName,
    fields: [
      { name: 'chave',  description: 'Chave',     order: 0, dataType: 'string' },
      { name: 'numDoc', description: 'Num Doc',   order: 1, dataType: 'string' },
      { name: 'codPart',description: 'Cod Part', order: 2, dataType: 'string' },
      { name: `${label}_C100`,       description: `${label} C100`,       order: 3, dataType: 'decimal' },
      { name: `soma_${label}_C170`, description: `Soma ${label} C170`, order: 4, dataType: 'decimal' },
      { name: 'diferenca',            description: 'Diferença',          order: 5, dataType: 'decimal' },
    ],

    /**
     * Executa a análise sobre as notas fornecidas.
     * Compara o valor total do campo no C170 com o valor correspondente no C100.
     */
    execute(notas: Map<string, {c100: RegistroC100; itens: RegistroC170[]; resumosC190: RegistroC190[];}>) {
      const erros: any[] = [];

      for (const [chave, nota] of notas.entries()) {
        if (!nota.itens.length) continue;

        // Soma os valores do campo C170 para todos os itens da nota
        const soma = nota.itens.reduce((soma, item) => soma + (item[fieldC170] as number), 0);

        // Obtém o valor declarado no C100
        const valorNota = nota.c100[fieldC100] as number;

        // Calcula a diferença e arredonda para 2 casas decimais
        const diferenca = Math.abs(soma - valorNota);
        const arredondada = parseFloat(diferenca.toFixed(2));

        // Se a diferença for significativa, registra o erro
        if (arredondada >= 0.01) {
          erros.push({
            chave,
            numDoc: nota.c100.NUM_DOC,
            codPart: nota.c100.COD_PART,
            [`${label}_C100`]: parseFloat(valorNota.toFixed(2)),
            [`soma_${label}_C170`]: parseFloat(soma.toFixed(2)),
            diferenca: arredondada,
          });
        }
      }

      return erros;
    },
  };
}
