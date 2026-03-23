import type { LocalExchangeReason } from "@/src/features/troca/types";
import { MovementReasonModal } from "@/src/features/shared/stock-movement/components/movement-reason-modal";

type TrocaReasonModalProps = {
  visible: boolean;
  reasons: readonly LocalExchangeReason[];
  selectedReasonId: number | null;
  onSelectReason: (reasonId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function TrocaReasonModal({
  visible,
  reasons,
  selectedReasonId,
  onSelectReason,
  onClose,
  onConfirm,
}: TrocaReasonModalProps) {
  return (
    <MovementReasonModal
      eyebrow="Troca"
      emptyMessage="Execute a sincronizacao global antes de lancar trocas."
      reasons={reasons}
      selectLabel="Motivo de troca"
      selectPlaceholder="Selecionar motivo de troca"
      selectedReasonId={selectedReasonId}
      subtitle="Escolha o motivo da troca antes de iniciar o lancamento."
      title="Selecionar motivo"
      visible={visible}
      onClose={onClose}
      onConfirm={onConfirm}
      onSelectReason={onSelectReason}
    />
  );
}
