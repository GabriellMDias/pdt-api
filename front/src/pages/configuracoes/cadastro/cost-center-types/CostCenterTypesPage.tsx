import { useMemo } from "react";
import Layout from "../../../../components/Layout";
import { GridForm, type Column, type Id } from "../../../../components/crud/GridForm";
import { useAuth } from "../../../../hooks/useAuth";
import { useCostCenterTypesCrud } from "./hooks/useCostCenterTypesCrud";
import CostCenterTypeRateioForm from "./components/CostCenterTypeRateioForm";
import type { CostCenterType, UpdateCostCenterTypePayload } from "./types";

export default function CostCenterTypesPage() {
  const { token } = useAuth();

  const { fetchAll, updateItem } = useCostCenterTypesCrud(token);

  const columns: Column<CostCenterType>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "description", header: "Descrição", width: "320px" },
    { key: "id_costcentertype_vr", header: "ID VR", width: "110px" },
    {
      key: "useParticipationStore",
      header: "Rateio Loja",
      width: "110px",
      render: (row) => (row.useParticipationStore ? "Sim" : "Não"),
    },
    {
      key: "useParticipationCostCenter",
      header: "Rateio CC",
      width: "110px",
      render: (row) => (row.useParticipationCostCenter ? "Sim" : "Não"),
    },
    {
      key: "items",
      header: "Itens",
      width: "90px",
      render: (row) => row.costCenterTypeItems?.length ?? 0,
    },
  ], []);

  return (
    <Layout title="Tipos de Centro de Custo">
      <GridForm<CostCenterType, UpdateCostCenterTypePayload>
        title=""
        idOf={(row) => row.id}
        columns={columns}
        fetchAll={async () => fetchAll()}
        createItem={async () => console.log("")}
        updateItem={(id: Id, data) => updateItem(id, data)}
        deleteItem={async () => console.log("")}
        renderForm={(props: any) => <CostCenterTypeRateioForm {...props} />}
        searchPlaceholder="Buscar por descrição ou ID..."
        canCreate={false}
        canEdit={true}
        canDelete={false}
      />
    </Layout>
  );
}
