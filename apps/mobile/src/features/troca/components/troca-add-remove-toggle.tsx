import type { TrocaMovementType } from '@/src/features/troca/types';
import { MovementTypeToggle } from '@/src/features/shared/stock-movement/components/movement-type-toggle';

type TrocaAddRemoveToggleProps = {
  value: TrocaMovementType;
  onChange: (value: TrocaMovementType) => void;
};

export function TrocaAddRemoveToggle({
  value,
  onChange,
}: TrocaAddRemoveToggleProps) {
  return <MovementTypeToggle value={value} onChange={onChange} />;
}
