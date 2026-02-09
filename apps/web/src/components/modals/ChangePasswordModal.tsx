import { useEffect, useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DefaultButton from '../inputs/DefaultButton';
import DefaultInput from '../inputs/DefaultInput';
import { toast } from 'react-toastify';
import { changePassword } from '../../services/account';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  token: string | null;
}

export default function ChangePasswordModal({ open, onClose, token }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSubmitting(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmNewPassword) return false;
    if (newPassword !== confirmNewPassword) return false;
    return true;
  }, [currentPassword, newPassword, confirmNewPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Você não está autenticado');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('A confirmação da senha não confere');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword(token, currentPassword, newPassword, confirmNewPassword);
      toast.success(res.message || 'Senha alterada com sucesso');
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível alterar a senha');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-black dark:text-white">Alterar senha</h2>
          <button
            type="button"
            className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <DefaultInput
            type="password"
            label="Senha atual"
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <DefaultInput
            type="password"
            label="Nova senha"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <DefaultInput
            type="password"
            label="Confirmar nova senha"
            placeholder="Repita a nova senha"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />

          {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
            <p className="text-sm text-red-400">A confirmação da senha não confere.</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <DefaultButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </DefaultButton>
            <DefaultButton type="submit" variant="primary" disabled={!canSubmit || submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </DefaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}
