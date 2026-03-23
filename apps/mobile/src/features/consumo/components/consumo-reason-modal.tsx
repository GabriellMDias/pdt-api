import type { LocalConsumptionReason } from '@/src/features/consumo/types';
import { MovementReasonModal } from '@/src/features/shared/stock-movement/components/movement-reason-modal';

type ConsumoReasonModalProps = {
  visible: boolean;
  reasons: readonly LocalConsumptionReason[];
  selectedReasonId: number | null;
  onSelectReason: (reasonId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConsumoReasonModal({
  visible,
  reasons,
  selectedReasonId,
  onSelectReason,
  onClose,
  onConfirm,
}: ConsumoReasonModalProps) {
  return (
    <MovementReasonModal
      eyebrow="Consumo"
      emptyMessage="Execute a sincronizacao global antes de lancar consumos."
      reasons={reasons}
      selectLabel="Tipo de consumo"
      selectPlaceholder="Selecionar tipo de consumo"
      selectedReasonId={selectedReasonId}
      subtitle="Escolha o tipo de consumo antes de iniciar o lancamento."
      title="Selecionar tipo"
      visible={visible}
      onClose={onClose}
      onConfirm={onConfirm}
      onSelectReason={onSelectReason}
    />
  );
}
