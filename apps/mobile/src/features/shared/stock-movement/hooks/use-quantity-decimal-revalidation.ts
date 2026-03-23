import { useEffect } from 'react';
import { revalidateQuantityInputForDecimalSupport } from '@/src/features/shared/stock-movement/utils';

type UseQuantityDecimalRevalidationParams = {
  enabled: boolean;
  allowDecimal: boolean;
  quantityInput: string;
  setQuantityInput: (value: string) => void;
  onInvalid: (message: string) => void;
  invalidMessage?: string;
};

export function useQuantityDecimalRevalidation({
  enabled,
  allowDecimal,
  quantityInput,
  setQuantityInput,
  onInvalid,
  invalidMessage,
}: UseQuantityDecimalRevalidationParams) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const result = revalidateQuantityInputForDecimalSupport({
      quantityInput,
      allowDecimal,
      invalidMessage,
    });

    if (!result.invalidated || !result.message) {
      return;
    }

    setQuantityInput(result.nextValue);
    onInvalid(result.message);
  }, [
    allowDecimal,
    enabled,
    invalidMessage,
    onInvalid,
    quantityInput,
    setQuantityInput,
  ]);
}
