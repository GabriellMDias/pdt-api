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
  users, selectedUserId, onSelectUser,
  userQuery, onChangeUserQuery,
  copyFromId, onChangeCopyFromId, onCopyFrom
}: Props) {
  const filtered = userQuery.trim()
    ? users.filter(u => `${u.id} ${u.name} ${u.email}`.toLowerCase().includes(userQuery.trim().toLowerCase()))
    : users;

  return (
    <Section
      title="Usuários"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <SearchIcon />
          <input
            value={userQuery}
            onChange={(e)=>onChangeUserQuery(e.target.value)}
            placeholder="Buscar usuário..."
            style={{
              flex: 1, minWidth: 0,
              background: "var(--color-pilar-default-bg-dark)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e5e7eb", borderRadius: 8, padding: "6px 10px", outline: "none"
            }}
          />
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 520, overflow: "auto" }}>
        {filtered.map(u => {
          const active = selectedUserId === u.id;
          return (
            <button
              key={u.id}
              onClick={()=>onSelectUser(u.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8,
                background: active ? "var(--color-pilar-default-bg-dark)" : "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                <strong style={{ fontSize: 14 }}>{u.name}</strong>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{u.email}</span>
              </div>
              {u.id === 0 && <Badge tone="info">admin</Badge>}
            </button>
          );
        })}
      </div>

      {/* Copiar de outro usuário */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        <select
          value={copyFromId}
          onChange={(e)=>onChangeCopyFromId(e.target.value === "" ? "" : Number(e.target.value))}
          style={{
            width: "100%",
            background: "var(--color-pilar-default-bg-dark)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#e5e7eb",
            borderRadius: 8, padding: "8px 10px"
          }}
        >
          <option value="">Copiar permissões de...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          onClick={onCopyFrom}
          style={{
            width: "100%",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "var(--color-pilar-default-bg2-dark)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#fff",
            padding: "8px 12px", borderRadius: 10, cursor: "pointer"
          }}
        >
          <ContentCopyIcon fontSize="small" /> Copiar
        </button>
      </div>
    </Section>
  );
}