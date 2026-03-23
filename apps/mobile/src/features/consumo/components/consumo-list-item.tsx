import { MovementListItem } from '@/src/features/shared/stock-movement/components/movement-list-item';
import type { LocalConsumoEntry } from '@/src/features/consumo/types';

type ConsumoListItemProps = {
  entry: LocalConsumoEntry;
  onRemove: (entry: LocalConsumoEntry) => void;
};

export function ConsumoListItem({ entry, onRemove }: ConsumoListItemProps) {
  return <MovementListItem entry={entry} reasonLabel="Tipo Consumo" onRemove={onRemove} />;
}
