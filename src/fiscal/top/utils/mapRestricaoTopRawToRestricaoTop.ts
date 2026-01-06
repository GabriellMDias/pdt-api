import { RestricaoTop, RestricaoTopRaw } from "../entities/restricao-top.entity";

export function mapRestricaoTopRawToRestricaoTop(
  rows: RestricaoTopRaw[]
): RestricaoTop | null {

  if (rows.length === 0) {
    return null;
  }

  const { codtipoper, id_tipmov } = rows[0];

  const restricoesMap = new Map<number, {
    id_tiporestricao: number;
    codcolrest: number[];
    series: string[] | null;
    restricao: 'S' | 'N';
  }>();

  for (const row of rows) {
    const key = row.id_tiporestricao;

    if (!restricoesMap.has(key)) {
      restricoesMap.set(key, {
        id_tiporestricao: row.id_tiporestricao,
        codcolrest: [],
        series: null,
        restricao: row.restricao,
      });
    }

    const restricao = restricoesMap.get(key)!;

    // evita duplicidade
    if (!restricao.codcolrest.includes(row.codcolrest)) {
      restricao.codcolrest.push(row.codcolrest);
    }

    if (row.serie) {
      if (!restricao.series) {
        restricao.series = [];
      }

      if (!restricao.series.includes(row.serie)) {
        restricao.series.push(row.serie);
      }
    }
  }

  return {
    codtipoper,
    id_tipmov,
    restricoes: Array.from(restricoesMap.values()),
  };
}
