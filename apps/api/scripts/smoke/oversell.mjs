/*
Deterministic oversell smoke:

- resets dev state (optional)
- sets a single item stock to 1 in a specific branch
- opens 2 sessions (2 tables)
- creates 2 carts, then concurrently tries to hold qty=1 for the same item

Expected:
  exactly 1 request succeeds and 1 fails with 409 OUT_OF_STOCK

Run:
  pnpm -C apps/api smoke:oversell
*/

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const USERNAME = process.env.SMOKE_ADMIN_USERNAME || "admin";
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "admin123";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function http(method, url, { token, json } = {}) {
  const headers = {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

function pickErrorCode(body) {
  if (!body) return "";
  if (typeof body === "object") return String(body.code || (body.error && body.error.code) || body.message || "");
  return String(body || "");
}

function errMsg(prefix, status, body) {
  const code = pickErrorCode(body);
  const b = typeof body === "string" ? body : JSON.stringify(body);
  return `${prefix} (status=${status}, code=${code}) body=${b}`;
}

async function main() {
  console.log(`\n🧪 Oversell smoke (deterministic) -> ${BASE_URL}`);

  // track opened sessions for cleanup
  let sessionKey1 = null;
  let sessionKey2 = null;

  async function closeSessionSafe(sessionKey) {
    if (!sessionKey) return;
    const r = await http("POST", `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionKey)}/close`);
    if (!r.res.ok) {
      console.warn("⚠️ close session failed:", sessionKey, r.res.status, r.body);
    }
  }

  try {
    // 1) Admin login
    const login = await http("POST", `${BASE_URL}/api/v1/admin/login`, {
      json: { username: USERNAME, password: PASSWORD },
    });
    if (!login.res.ok) {
      throw new Error(errMsg("Login failed", login.res.status, login.body));
    }
    const adminToken = login.body?.token || login.body?.data?.token;
    if (!adminToken) {
      throw new Error(errMsg("Login response missing token", login.res.status, login.body));
    }
    console.log("✅ Admin token acquired");

    // 2) Reset dev state (optional but recommended for deterministic run)
    const reset = await http(
      "POST",
      `${BASE_URL}/api/v1/admin/maintenance/reset-dev-state?flushRedis=true&restock=true&restockQty=10`,
      { token: adminToken, json: { confirm: "RESET" } },
    );
    if (!reset.res.ok) {
      console.warn("⚠️ reset-dev-state failed (continuing):", reset.res.status, reset.body);
    } else {
      console.log("✅ reset-dev-state ok");
    }

    // 3) Pick 2 tables in same branch
    const tables = await http("GET", `${BASE_URL}/api/v1/tables`);
    if (!tables.res.ok) {
      throw new Error(errMsg("List tables failed", tables.res.status, tables.body));
    }
    const rows = Array.isArray(tables.body) ? tables.body : (tables.body?.items || tables.body?.data || []);
    const candidates = rows
      .map((t) => ({
        id: String(t.id || t.tableId || t.table_id || t.tableID || ""),
        code: t.code || t.tableCode || t.table_code,
        status: t.status || t.tableStatus || t.table_status,
        branchId: String(t.branchId || t.branch_id || ""),
      }))
      .filter((t) => t.id && t.branchId && String(t.status || "").toUpperCase() === "AVAILABLE");

    if (candidates.length < 2) {
      throw new Error(`Need at least 2 AVAILABLE tables for this smoke. Got=${candidates.length}`);
    }

    // Prefer same branch
    let t1 = null;
    let t2 = null;
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        if (candidates[i].branchId === candidates[j].branchId) {
          t1 = candidates[i];
          t2 = candidates[j];
          break;
        }
      }
      if (t1) break;
    }
    t1 = t1 || candidates[0];
    t2 = t2 || candidates[1];
    const branchId = t1.branchId;
    console.log(`✅ Picked tables: ${t1.code || t1.id}, ${t2.code || t2.id} (branchId=${branchId})`);

    // 4) Open 2 sessions
    const s1 = await http("POST", `${BASE_URL}/api/v1/sessions/open`, { json: { tableId: t1.id } });
    const s2 = await http("POST", `${BASE_URL}/api/v1/sessions/open`, { json: { tableId: t2.id } });
    if (!s1.res.ok || !s2.res.ok) {
      throw new Error(
        `Open session failed: s1=${s1.res.status} code=${pickErrorCode(s1.body)} | s2=${s2.res.status} code=${pickErrorCode(s2.body)}`,
      );
    }

    sessionKey1 =
      s1.body?.sessionKey ||
      s1.body?.data?.sessionKey ||
      s1.body?.session?.sessionKey ||
      s1.body?.data?.session?.sessionKey;
    sessionKey2 =
      s2.body?.sessionKey ||
      s2.body?.data?.sessionKey ||
      s2.body?.session?.sessionKey ||
      s2.body?.data?.session?.sessionKey;

    if (!sessionKey1 || !sessionKey2) {
      throw new Error(`Open session missing sessionKey: s1=${JSON.stringify(s1.body)} s2=${JSON.stringify(s2.body)}`);
    }
    console.log("✅ Opened 2 sessions");

    // 5) Pick one menu itemId
    const menu = await http("GET", `${BASE_URL}/api/v1/menu/items?limit=50`);
    if (!menu.res.ok) {
      throw new Error(errMsg("List menu items failed", menu.res.status, menu.body));
    }
    const itemsWrap = menu.body?.items ? menu.body : (menu.body?.data?.items ? menu.body.data : menu.body);
    const items = Array.isArray(itemsWrap) ? itemsWrap : (itemsWrap?.items || []);
    if (!items.length) {
      throw new Error(`Menu items empty: ${JSON.stringify(menu.body)}`);
    }
    const pick = items.find((it) => Number(it.stockQty ?? it.stock_qty ?? it.stock ?? it.quantity ?? 0) > 0) || items[0];
    const itemId = String(pick.menuItemId || pick.itemId || pick.item_id || pick.id);
    if (!itemId) {
      throw new Error(`Cannot resolve itemId from menu: ${JSON.stringify(pick)}`);
    }
    console.log(`✅ Picked itemId=${itemId} (${pick.name || pick.itemName || "item"})`);

    // 6) Force stock=1 for deterministic oversell (DEV-only endpoint)
    const setStock = await http("POST", `${BASE_URL}/api/v1/admin/maintenance/dev/set-stock`, {
      token: adminToken,
      json: { branchId, itemId, quantity: 1 },
    });
    if (!setStock.res.ok) {
      throw new Error(errMsg("set-stock failed", setStock.res.status, setStock.body));
    }
    console.log("✅ Stock forced to 1");

    // 7) Create carts
    const c1 = await http("POST", `${BASE_URL}/api/v1/carts/session/${encodeURIComponent(sessionKey1)}`);
    const c2 = await http("POST", `${BASE_URL}/api/v1/carts/session/${encodeURIComponent(sessionKey2)}`);
    if (!c1.res.ok || !c2.res.ok) {
      throw new Error(
        `Create cart failed: c1=${c1.res.status} code=${pickErrorCode(c1.body)} | c2=${c2.res.status} code=${pickErrorCode(c2.body)}`,
      );
    }
    const cartKey1 = c1.body?.cartKey || c1.body?.data?.cartKey;
    const cartKey2 = c2.body?.cartKey || c2.body?.data?.cartKey;
    if (!cartKey1 || !cartKey2) {
      throw new Error(`Cart response missing cartKey: c1=${JSON.stringify(c1.body)} c2=${JSON.stringify(c2.body)}`);
    }
    console.log("✅ Created 2 carts");

    // 8) Concurrent hold attempt
    // small delay to align both requests
    await sleep(20);
    const upsert = (cartKey) =>
      http("PUT", `${BASE_URL}/api/v1/carts/${encodeURIComponent(cartKey)}/items`, {
        json: { itemId, quantity: 1 },
      });

    const [rA, rB] = await Promise.allSettled([upsert(cartKey1), upsert(cartKey2)]);
    const results = [rA, rB].map((r) =>
      r.status === "fulfilled" ? r.value : { res: { ok: false, status: 0 }, body: String(r.reason) },
    );

    const ok = results.filter((r) => r.res.ok);
    const fail = results.filter((r) => !r.res.ok);

    console.log("\n=== RESULT ===");
    results.forEach((r, i) => {
      console.log(`Req#${i + 1}: status=${r.res.status} ok=${r.res.ok} bodyCode=${pickErrorCode(r.body)}`);
    });

    if (ok.length !== 1 || fail.length !== 1) {
      throw new Error("Expected exactly 1 success and 1 failure.");
    }

    const failCode = pickErrorCode(fail[0].body);
    if (fail[0].res.status !== 409 || failCode !== "OUT_OF_STOCK") {
      throw new Error(`Expected failure 409 OUT_OF_STOCK, got: ${fail[0].res.status} ${failCode}`);
    }

    console.log("\n✅ PASS: oversell prevented deterministically (1 ok, 1 OUT_OF_STOCK)");
  } finally {
    // ✅ Always release tables
    await closeSessionSafe(sessionKey1);
    await closeSessionSafe(sessionKey2);
    if (sessionKey1 || sessionKey2) {
      console.log("✅ Teardown ok: sessions closed");
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exitCode = 1;
});
