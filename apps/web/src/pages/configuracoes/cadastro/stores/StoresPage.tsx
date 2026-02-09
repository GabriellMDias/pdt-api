import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Layout from "../../../../components/Layout";
import { GridForm, type Column, type Id } from "../../../../components/crud/GridForm";
import { useAuth } from "../../../../hooks/useAuth";
import StoreForm from "./components/StoreForm";
import { useStoresCrud } from "./hooks/useStoresCrud";
import type { Store, UpdateStorePayload } from "./types";

export default function StoresPage() {
  const { token } = useAuth();
  const { fetchAll, updateItem, syncFromVr } = useStoresCrud(token);
  const [syncVersion, setSyncVersion] = useState(0);

  const fetchAllWithRefresh = useCallback(async () => {
    void syncVersion;
    return fetchAll();
  }, [fetchAll, syncVersion]);

  const columns: Column<Store>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "description", header: "Descricao VR", width: "280px" },
    { key: "storeName", header: "Nome da Loja", width: "240px" },
    { key: "cnpj", header: "CNPJ", width: "180px" },
    {
      key: "activeStatus",
      header: "Ativo",
      width: "90px",
      render: (row) => (row.activeStatus ? "Sim" : "Nao"),
    },
  ], []);

  return (
    <Layout title="Lojas">
      <GridForm<Store, never, UpdateStorePayload>
        title=""
        idOf={(row) => row.id}
        columns={columns}
        fetchAll={fetchAllWithRefresh}
        createItem={async () => undefined}
        updateItem={(id: Id, data) => updateItem(id, data)}
        deleteItem={async () => undefined}
        renderForm={(props) => <StoreForm {...props} />}
        searchPlaceholder="Buscar por ID, descricao, nome ou CNPJ..."
        canCreate={false}
        canEdit={true}
        canDelete={false}
        actionsForRow={() => [
          {
            key: "sync-vr",
            label: "Sincronizar Lojas",
            allowWithoutSelection: true,
            onClick: async () => {
              try {
                await syncFromVr();
                setSyncVersion((value) => value + 1);
                toast.success("Lojas sincronizadas com sucesso.", {
                  position: "top-right",
                  autoClose: 5000,
                  hideProgressBar: false,
                  pauseOnHover: true,
                  draggable: true,
                  theme: "dark",
                });
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                toast.error(`Falha ao sincronizar lojas: ${message}`, {
                  position: "top-right",
                  autoClose: 5000,
                  hideProgressBar: false,
                  pauseOnHover: true,
                  draggable: true,
                  theme: "dark",
                });
              }
            },
          },
        ]}
      />
    </Layout>
  );
}
