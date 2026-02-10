import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Badge from "./Badge";
import type { User } from "../types";
import Section from "./Section";

type Props = {
  users: User[];
  selectedUserId: number | null;
  onSelectUser: (id: number) => void;
  userQuery: string;
  onChangeUserQuery: (q: string) => void;
  copyFromId: number | "";
  onChangeCopyFromId: (v: number | "") => void;
  onCopyFrom: () => void;
};

export default function UsersSidebar({
  users,
  selectedUserId,
  onSelectUser,
  userQuery,
  onChangeUserQuery,
  copyFromId,
  onChangeCopyFromId,
  onCopyFrom,
}: Props) {
  const filtered = userQuery.trim()
    ? users.filter((u) =>
        `${u.id} ${u.name} ${u.email}`
          .toLowerCase()
          .includes(userQuery.trim().toLowerCase()),
      )
    : users;

  return (
    <Section
      title="Usuarios"
      right={
        <div className="flex min-w-0 items-center gap-2 text-neutral-500 dark:text-neutral-300">
          <SearchIcon fontSize="small" />
          <input
            value={userQuery}
            onChange={(e) => onChangeUserQuery(e.target.value)}
            placeholder="Buscar usuario..."
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/15 dark:bg-pilar-default-bg-dark dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
          />
        </div>
      }
    >
      <div className="flex max-h-[520px] flex-col gap-2 overflow-auto pr-1">
        {filtered.map((u) => {
          const active = selectedUserId === u.id;
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => onSelectUser(u.id)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-neutral-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-neutral-100"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/5"
              }`}
            >
              <div className="flex flex-col text-left">
                <strong className="text-sm">{u.name}</strong>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</span>
              </div>
              {u.id === 0 && <Badge tone="info">admin</Badge>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <select
          value={copyFromId}
          onChange={(e) =>
            onChangeCopyFromId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/15 dark:bg-pilar-default-bg-dark dark:text-neutral-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
        >
          <option value="">Copiar permissoes de...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onCopyFrom}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/15 dark:bg-pilar-default-bg-dark dark:text-neutral-200 dark:hover:bg-white/10"
        >
          <ContentCopyIcon fontSize="small" /> Copiar
        </button>
      </div>
    </Section>
  );
}
