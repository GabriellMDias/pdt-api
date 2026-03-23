export function formatDecimalValue(value: number) {
  return value.toFixed(3).replace('.', ',');
}

export const INTEGER_ONLY_QUANTITY_MESSAGE =
  'O produto selecionado aceita apenas quantidade inteira. Informe um novo valor.';

export function parseInputNumber(value: string): number {
  const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeManualNumberInput(rawValue: string, allowDecimal: boolean) {
  if (!rawValue) {
    return '';
  }

  if (!allowDecimal) {
    const digits = rawValue.replace(/\D/g, '');
    return digits ? String(Number(digits)) : '';
  }

  const normalized = rawValue.replace(/\./g, ',');
  let nextValue = '';
  let hasComma = false;

  for (const char of normalized) {
    if (/\d/.test(char)) {
      nextValue += char;
      continue;
    }

    if (char === ',' && !hasComma) {
      nextValue += ',';
      hasComma = true;
    }
  }

  return nextValue;
}

export function revalidateQuantityInputForDecimalSupport(payload: {
  quantityInput: string;
  allowDecimal: boolean;
  invalidMessage?: string;
}) {
  const trimmedValue = payload.quantityInput.trim();

  if (!trimmedValue || payload.allowDecimal) {
    return {
      invalidated: false,
      nextValue: payload.quantityInput,
      message: null,
    };
  }

  if (!/[.,]/.test(trimmedValue)) {
    return {
      invalidated: false,
      nextValue: payload.quantityInput,
      message: null,
    };
  }

  return {
    invalidated: true,
    nextValue: '',
    message: payload.invalidMessage ?? INTEGER_ONLY_QUANTITY_MESSAGE,
  };
}

export function formatDisplayNumber(
  value: number | null | undefined,
  fractionDigits = 3,
) {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }

  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
