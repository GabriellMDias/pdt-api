import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import type { Href } from "expo-router";
import type {
  HomeFavoriteShortcut,
  HomeNavigationGroup,
  HomeNavigationItem,
} from "@/src/features/home/types";

function createPlaceholderItem(
  key: string,
  legacyId: number,
  label: string,
  legacyRoute: string,
  legacyTable: string | null,
  renderIcon: HomeNavigationItem["renderIcon"],
): HomeNavigationItem {
  return {
    key,
    legacyId,
    label,
    description: "",
    legacyRoute,
    legacyTable,
    status: "placeholder",
    renderIcon,
    target: {
      type: "placeholder",
      title: label,
      description: "",
    },
  };
}

export const homeNavigationGroups: HomeNavigationGroup[] = [
  {
    id: 1,
    label: "Menu Principal",
    renderIcon: (size, color) => (
      <Entypo color={color} name="home" size={size} />
    ),
    items: [],
  },
  {
    id: 2,
    label: "Administrativo",
    renderIcon: (size, color) => (
      <AntDesign color={color} name="folder-open" size={size} />
    ),
    items: [
      createPlaceholderItem(
        "cotacao-fornecedor",
        1,
        "Cotacao Fornecedor",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome color={color} name="industry" size={size} />
        ),
      ),
      createPlaceholderItem(
        "cotacao-cliente",
        2,
        "Cotacao Cliente",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="person" size={size} />
        ),
      ),
      createPlaceholderItem(
        "pedido",
        3,
        "Pedido",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome color={color} name="shopping-basket" size={size} />
        ),
      ),
      {
        key: "ruptura",
        legacyId: 5,
        label: "Ruptura",
        description:
          "Primeira feature operacional migrada para a arquitetura nova.",
        legacyRoute: "/administrativo/ruptura/transmissionScreen",
        legacyTable: "logruptura",
        status: "available",
        renderIcon: (size, color) => (
          <FontAwesome6 color={color} name="boxes-stacked" size={size} />
        ),
        target: {
          type: "route",
          href: "/rupture",
        },
      },
      createPlaceholderItem(
        "venda-pdv",
        6,
        "Venda PDV",
        "/developing",
        null,
        (size, color) => (
          <MaterialIcons color={color} name="local-grocery-store" size={size} />
        ),
      ),
      createPlaceholderItem(
        "venda-periodo",
        7,
        "Venda Periodo",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="calendar-check" size={size} />
        ),
      ),
      createPlaceholderItem(
        "analise-oferta",
        8,
        "Analise de Oferta",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome5 color={color} name="search-dollar" size={size} />
        ),
      ),
      createPlaceholderItem(
        "administracao-preco",
        9,
        "Administracao de Preco",
        "/developing",
        null,
        (size, color) => (
          <MaterialIcons color={color} name="price-check" size={size} />
        ),
      ),
      createPlaceholderItem(
        "agenda-fornecedor",
        11,
        "Agenda Fornecedor",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="calendar-alt" size={size} />
        ),
      ),
      createPlaceholderItem(
        "pedido-compras",
        12,
        "Pedido de Compras",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome5 color={color} name="shopping-basket" size={size} />
        ),
      ),
    ],
  },
  {
    id: 3,
    label: "Estoque",
    renderIcon: (size, color) => (
      <FontAwesome5 color={color} name="boxes" size={size} />
    ),
    items: [
      {
        key: "balanco",
        legacyId: 13,
        label: "Balanco",
        description:
          "Rotina de balanco migrada com agrupamento por numero, itens coletados e coleta dedicada.",
        legacyRoute: "/estoque/balanco/transmissionScreen",
        legacyTable: "logbalancoitem",
        status: "available",
        renderIcon: (size, color) => (
          <FontAwesome5 color={color} name="clipboard-list" size={size} />
        ),
        target: {
          type: "route",
          href: "/balanco" as Href,
        },
      },
      createPlaceholderItem(
        "cesta-basica",
        14,
        "Cesta Basica",
        "/developing",
        null,
        (size, color) => <FontAwesome5 color={color} name="box" size={size} />,
      ),
      {
        key: "consumo",
        legacyId: 15,
        label: "Consumo",
        description:
          "Rotina de consumo migrada para a arquitetura offline-first do app novo.",
        legacyRoute: "/estoque/consumo/transmissionScreen",
        legacyTable: "logconsumo",
        status: "available",
        renderIcon: (size, color) => (
          <FontAwesome5 color={color} name="coffee" size={size} />
        ),
        target: {
          type: "route",
          href: "/consumo" as Href,
        },
      },
      createPlaceholderItem(
        "perda",
        16,
        "Perda",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="arrow-trend-down" size={size} />
        ),
      ),
      {
        key: "producao",
        legacyId: 17,
        label: "Producao",
        description:
          "Rotina de producao migrada para a arquitetura offline-first do app novo.",
        legacyRoute: "/estoque/producao/transmissionScreen",
        legacyTable: "logproducao",
        status: "available",
        renderIcon: (size, color) => (
          <MaterialCommunityIcons color={color} name="blender" size={size} />
        ),
        target: {
          type: "route",
          href: "/producao" as Href,
        },
      },
      createPlaceholderItem(
        "quebra",
        18,
        "Quebra",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="trash-can" size={size} />
        ),
      ),
      createPlaceholderItem(
        "transferencia-interna",
        19,
        "Transferencia Interna",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="money-bill-transfer" size={size} />
        ),
      ),
      {
        key: "troca",
        legacyId: 20,
        label: "Troca",
        description:
          "Rotina de troca migrada para a arquitetura offline-first do app novo.",
        legacyRoute: "/estoque/troca/transmissionScreen",
        legacyTable: "logtroca",
        status: "available",
        renderIcon: (size, color) => (
          <Entypo color={color} name="cycle" size={size} />
        ),
        target: {
          type: "route",
          href: "/troca" as Href,
        },
      },
      createPlaceholderItem(
        "estoque-loja",
        21,
        "Estoque Loja",
        "/developing",
        null,
        (size, color) => (
          <MaterialIcons color={color} name="forklift" size={size} />
        ),
      ),
      createPlaceholderItem(
        "validade",
        22,
        "Validade",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="calendar-clock"
            size={size}
          />
        ),
      ),
    ],
  },
  {
    id: 4,
    label: "Financeiro",
    renderIcon: (size, color) => (
      <MaterialIcons color={color} name="attach-money" size={size} />
    ),
    items: [
      createPlaceholderItem(
        "contas-pagar",
        23,
        "Contas a Pagar",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="trending-down"
            size={size}
          />
        ),
      ),
      createPlaceholderItem(
        "contas-receber",
        24,
        "Contas a Receber",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="trending-up"
            size={size}
          />
        ),
      ),
    ],
  },
  {
    id: 5,
    label: "Nota Fiscal",
    renderIcon: (size, color) => (
      <MaterialCommunityIcons
        color={color}
        name="newspaper-variant-outline"
        size={size}
      />
    ),
    items: [
      createPlaceholderItem(
        "conferencia-nf",
        25,
        "Conferencia NF Entrada",
        "/developing",
        null,
        (size, color) => (
          <MaterialIcons color={color} name="input" size={size} />
        ),
      ),
      createPlaceholderItem(
        "saida",
        26,
        "Saida",
        "/developing",
        null,
        (size, color) => <AntDesign color={color} name="export" size={size} />,
      ),
      createPlaceholderItem(
        "despesa",
        27,
        "Despesa",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons color={color} name="cash-minus" size={size} />
        ),
      ),
      createPlaceholderItem(
        "bonificacao",
        28,
        "Bonificacao",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons color={color} name="cash-plus" size={size} />
        ),
      ),
    ],
  },
  {
    id: 6,
    label: "Logistica",
    renderIcon: (size, color) => (
      <FontAwesome6 color={color} name="truck-ramp-box" size={size} />
    ),
    items: [
      createPlaceholderItem(
        "reposicao",
        29,
        "Reposicao",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="file-cabinet"
            size={size}
          />
        ),
      ),
      createPlaceholderItem(
        "controle-cargas",
        30,
        "Controle de Cargas",
        "/developing",
        null,
        (size, color) => (
          <MaterialIcons color={color} name="pallet" size={size} />
        ),
      ),
    ],
  },
  {
    id: 7,
    label: "Utilitario",
    renderIcon: (size, color) => (
      <FontAwesome5 color={color} name="calculator" size={size} />
    ),
    items: [
      createPlaceholderItem(
        "emissor-etiqueta",
        31,
        "Emissor Etiqueta",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons color={color} name="printer" size={size} />
        ),
      ),
      createPlaceholderItem(
        "estoque-online",
        32,
        "Estoque Online",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome6 color={color} name="boxes-stacked" size={size} />
        ),
      ),
      createPlaceholderItem(
        "consultar-preco",
        33,
        "Consultar Preco",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome5 color={color} name="dollar-sign" size={size} />
        ),
      ),
      createPlaceholderItem(
        "ddv-minimo",
        34,
        "DDV Minimo",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="calendar-today"
            size={size}
          />
        ),
      ),
      createPlaceholderItem(
        "vr-task",
        35,
        "VR Task",
        "/developing",
        null,
        (size, color) => (
          <FontAwesome5 color={color} name="tasks" size={size} />
        ),
      ),
    ],
  },
  {
    id: 8,
    label: "PDV",
    renderIcon: (size, color) => (
      <Feather color={color} name="monitor" size={size} />
    ),
    items: [
      createPlaceholderItem(
        "consistencia",
        36,
        "Consistencia",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="basket-check"
            size={size}
          />
        ),
      ),
      createPlaceholderItem(
        "motivo-cancelamento",
        37,
        "Motivo Cancelamento",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons color={color} name="cancel" size={size} />
        ),
      ),
      createPlaceholderItem(
        "motivo-desconto",
        38,
        "Motivo Desconto",
        "/developing",
        null,
        (size, color) => (
          <MaterialCommunityIcons
            color={color}
            name="brightness-percent"
            size={size}
          />
        ),
      ),
    ],
  },
];

export const defaultFavoriteShortcuts: HomeFavoriteShortcut[] = [
  { key: "favorite-ruptura", label: "Ruptura", itemKey: "ruptura" },
  { key: "favorite-balanco", label: "Balanco", itemKey: "balanco" },
  { key: "favorite-consumo", label: "Consumo", itemKey: "consumo" },
  { key: "favorite-producao", label: "Producao", itemKey: "producao" },
  { key: "favorite-troca", label: "Troca", itemKey: "troca" },
];

export function getHomeNavigationGroupById(groupId: number) {
  return homeNavigationGroups.find((group) => group.id === groupId) ?? null;
}

export function getHomeNavigationItemByKey(itemKey: string) {
  for (const group of homeNavigationGroups) {
    const item = group.items.find((candidate) => candidate.key === itemKey);
    if (item) {
      return { group, item };
    }
  }

  return null;
}
