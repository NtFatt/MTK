import {
  extractCartCreatedAt,
  extractCartKey,
  getOpsCart,
  getOrCreateOpsCartBySessionKey,
  normalizeOpsCartItems,
} from "./opsCartsApi";

export const OPS_TABLE_NO_SESSION_ERROR = "NO_SESSION";

export type LoadOpsTableLiveInput = {
  tableId: string | number;
  sessionKey?: string | null;
  cartKey?: string | null;
};

export type OpsTableLiveItem = {
  itemId: string;
  name?: string;
  qty: number;
  note?: string;
};

export type OpsTableLiveDetail = {
  tableId: string;
  sessionKey: string;
  cartKey: string;
  startedAt?: string;
  items: OpsTableLiveItem[];
};

export async function loadOpsTableLiveDetail(input: LoadOpsTableLiveInput): Promise<OpsTableLiveDetail> {
  const sessionKey = String(input.sessionKey ?? "").trim();
  if (!sessionKey) {
    throw new Error(OPS_TABLE_NO_SESSION_ERROR);
  }

  let cartKey = String(input.cartKey ?? "").trim();

  if (!cartKey) {
    const cart = await getOrCreateOpsCartBySessionKey(sessionKey);
    cartKey = extractCartKey(cart);
  }

  if (!cartKey) {
    return {
      tableId: String(input.tableId),
      sessionKey,
      cartKey: "",
      startedAt: undefined,
      items: [],
    };
  }

  const cartDetail = await getOpsCart(cartKey);

  return {
    tableId: String(input.tableId),
    sessionKey,
    cartKey,
    startedAt: extractCartCreatedAt(cartDetail),
    items: normalizeOpsCartItems(cartDetail).map((item) => ({
      itemId: item.itemId,
      name: item.name,
      qty: item.qty,
      note: item.note,
    })),
  };
}
