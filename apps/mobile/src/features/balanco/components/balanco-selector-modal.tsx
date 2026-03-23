import { OperationalSelectModal } from '@/src/features/shared/operational-entry/components/operational-select-modal';
import type { LocalBalanceHeader } from '@/src/features/balanco/types';
import {
  formatBalanceOptionDescription,
  formatBalanceOptionLabel,
  formatBalanceStatus,
} from '@/src/features/balanco/utils';

type BalancoSelectorModalProps = {
  visible: boolean;
  balances: readonly LocalBalanceHeader[];
  selectedBalanceId: number | null;
  onChange: (balanceId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function BalancoSelectorModal({
  visible,
  balances,
  selectedBalanceId,
  onChange,
  onClose,
  onConfirm,
}: BalancoSelectorModalProps) {
  return (
    <OperationalSelectModal
      emptyMessage="Nenhum balanco em aberto encontrado para a loja atual."
      eyebrow="Balanco"
      options={balances.map((balance) => ({
        value: balance.id,
        label: formatBalanceOptionLabel(balance),
        description: `${formatBalanceOptionDescription(balance)} • ${formatBalanceStatus(balance.statusCode)}`,
        searchText: `${balance.id} ${balance.description} ${balance.stockLabel}`,
      }))}
      searchable
      searchPlaceholder="Pesquisar por numero, descricao ou estoque"
      selectLabel="Balanco"
      selectPlaceholder="Selecionar balanco"
      subtitle="Escolha o balanco em aberto que recebera a coleta."
      title="Novo lancamento"
      value={selectedBalanceId}
      visible={visible}
      onChange={onChange}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
