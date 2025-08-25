export function parseDecimal(valor: string): number {
  if (!valor) return 0;
  return parseFloat(valor.replace(',', '.'));
}
