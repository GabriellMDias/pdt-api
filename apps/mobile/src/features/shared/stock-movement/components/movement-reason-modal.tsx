import type { SelectOption } from '@/src/components/ui';
import { OperationalSelectModal } from '@/src/features/shared/operational-entry/components/operational-select-modal';

type MovementReasonOption = {
  id: number;
  description: string;
};

type MovementReasonModalProps = {
  visible: boolean;
  reasons: readonly MovementReasonOption[];
  selectedReasonId: number | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  selectLabel: string;
  selectPlaceholder: string;
  emptyMessage: string;
  confirmLabel?: string;
  onSelectReason: (reasonId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function MovementReasonModal({
  visible,
  reasons,
  selectedReasonId,
  eyebrow,
  title,
  subtitle,
  selectLabel,
  selectPlaceholder,
  emptyMessage,
  confirmLabel = 'OK',
  onSelectReason,
  onClose,
  onConfirm,
}: MovementReasonModalProps) {
  const reasonOptions: SelectOption<number>[] = reasons.map((reason) => ({
    value: reason.id,
    label: `${reason.id} - ${reason.description}`,
  }));

  return (
    <OperationalSelectModal
      eyebrow={eyebrow}
      confirmLabel={confirmLabel}
      emptyMessage={emptyMessage}
      options={reasonOptions}
      selectLabel={selectLabel}
      selectPlaceholder={selectPlaceholder}
      subtitle={subtitle}
      title={title}
      value={selectedReasonId}
      visible={visible}
      onChange={onSelectReason}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
