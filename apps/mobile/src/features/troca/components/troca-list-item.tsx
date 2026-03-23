import { MovementListItem } from '@/src/features/shared/stock-movement/components/movement-list-item';
import type { LocalTrocaEntry } from '@/src/features/troca/types';

type TrocaListItemProps = {
  entry: LocalTrocaEntry;
  onRemove: (entry: LocalTrocaEntry) => void;
};

export function TrocaListItem({ entry, onRemove }: TrocaListItemProps) {
  return (
    <MovementListItem
      entry={entry}
      reasonLabel="Motivo Troca"
      onRemove={onRemove}
    />
  );
}
