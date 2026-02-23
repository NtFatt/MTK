/*
  Realtime sanity smoke (Socket.IO)

  Goal:
  - Connect to Socket.IO
  - Join rooms (admin + sessionKey) using join.v1
- Request replay after event
  - Trigger at least one domain event via HTTP (cart.updated)

  Usage:
    node scripts/smoke/realtime-sanity.mjs <postman_env.json> [timeoutMs]
*/

import { io } from "socket.io-client";
import fs from "node:fs";
import process from "node:process";

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function readPostmanEnv(filepath) {
  const raw = fs.readFileSync(filepath, "utf8");
  const json = JSON.parse(raw);
  const map = new Map();
  for (const v of json.values || []) {
    map.set(String(v.key), v.value);
  }
  return {
    get: (k, fallback = "") => {
      const v = map.get(k);
      return v === undefined || v === null ? fallback : String(v);
    },
  };
}

async function httpJson(method, url, body, headers = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

function isoPlusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function waitFor(predicate, timeoutMs, intervalMs = 50) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const out = predicate();
    if (out) return out;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function main() {
  const envPath = process.argv[2];
  const timeoutMs = Number(process.argv[3] ?? 30000);
  if (!envPath) die("Missing postman env json. Usage: node scripts/smoke/realtime-sanity.mjs <env.json> [timeoutMs]");

  const env = readPostmanEnv(envPath);

  const baseUrl = env.get("baseUrl").replace(/\/$/, "");
  if (!baseUrl) die("postman env missing baseUrl");

  const socketPath = env.get("socketPath", "/socket.io");
  const adminUsername = env.get("adminUsername", "admin");
  const adminPassword = env.get("adminPassword", "admin123");
  const areaName = env.get("areaName", "Zone A");
  const partySize = Number(env.get("partySize", "2")) || 2;

  console.log(`\n🧪 Realtime sanity: ${baseUrl} (path=${socketPath})`);

  // 1) Admin login (Bearer)
  const login = await httpJson("POST", `${baseUrl}/api/v1/admin/login`, { username: adminUsername, password: adminPassword }, {}, timeoutMs);
  if (login.status !== 200) {
    console.error(login.text);
    die(`Admin login failed: HTTP ${login.status}`);
  }
  const adminToken = String(login.json?.token || login.json?.accessToken || login.json?.data?.token || "");
  if (!adminToken) die("Admin login did not return token");

  const authz = { Authorization: `Bearer ${adminToken}` };

  // 2) Connect Socket.IO
  const socket = io(baseUrl, {
    path: socketPath,
    transports: ["websocket"],
    timeout: Math.min(timeoutMs, 15000),
  });

  const joinedRooms = new Set();
  const receivedEvents = [];

  socket.on("joined", (p) => {
    if (p?.room) joinedRooms.add(String(p.room));
  });

  socket.on("event", (evt) => {
    receivedEvents.push(evt);
  });

  const receivedV1 = [];
  const replayBatches = [];
  const gaps = [];

  socket.on("realtime:event.v1", (env) => {
    receivedV1.push(env);
  });
  socket.on("realtime:replay.v1", (batch) => {
    replayBatches.push(batch);
  });
  socket.on("realtime:gap.v1", (g) => {
    gaps.push(g);
  });

  const connected = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), Math.min(timeoutMs, 15000));
    socket.on("connect", () => {
      clearTimeout(t);
      resolve(true);
    });
    socket.on("connect_error", () => {
    });
  });
  if (!connected) {
    socket.close();
    die("Socket.IO connect failed (is REALTIME_ENABLED=true?)");
  }

  // 3) Join admin room (v1)
  const joinAdmin = await new Promise((resolve) => {
    socket.emit("realtime:join.v1", { adminToken, rooms: [{ room: "admin", lastSeq: 0 }] }, (out) => resolve(out));
  });
  if (!joinAdmin || joinAdmin.ok !== true) {
    socket.close();
    die("Join admin room (v1) failed");
  }

  // 4) Pick a menu item
  const menu = await httpJson("GET", `${baseUrl}/api/v1/menu/items?limit=5`, null, {}, timeoutMs);
  if (menu.status < 200 || menu.status > 299) {
    console.error(menu.text);
    socket.close();
    die(`List menu failed: HTTP ${menu.status}`);
  }
  const items = Array.isArray(menu.json?.items)
    ? menu.json.items
    : Array.isArray(menu.json?.data?.items)
      ? menu.json.data.items
      : Array.isArray(menu.json)
        ? menu.json
        : [];
  const first = items[0];
  const menuItemId = first?.menuItemId || first?.itemId || first?.item_id || first?.id;
  if (!menuItemId) {
    socket.close();
    die("Could not pick menuItemId");
  }

  // 5) Create reservation (retry once on NO_TABLE_AVAILABLE by resetting dev state)
  const reservedFrom = isoPlusMinutes(5);
  const reservedTo = isoPlusMinutes(65);

  const createReservation = () =>
    httpJson(
      "POST",
      `${baseUrl}/api/v1/reservations`,
      {
        areaName,
        partySize,
        contactName: "Realtime Smoke",
        contactPhone: "0900000000",
        note: "realtime-smoke",
        reservedFrom,
        reservedTo,
      },
      {},
      timeoutMs,
    );

  const pickCode = (json) => String(json?.code || json?.error?.code || "").trim();

  let rsv = await createReservation();

  // If tables are exhausted from previous runs, reset state and retry once.
  if (rsv.status !== 201) {
    const code = pickCode(rsv.json);
    if (rsv.status === 409 && code === "NO_TABLE_AVAILABLE") {
      console.warn("⚠️ NO_TABLE_AVAILABLE (409). Resetting dev state then retrying once...");
      const reset = await httpJson(
        "POST",
        `${baseUrl}/api/v1/admin/maintenance/reset-dev-state?flushRedis=true&restock=true&restockQty=10`,
        { confirm: "RESET" },
        authz,
        timeoutMs,
      );

      if (reset.status < 200 || reset.status >= 300) {
        console.error(reset.text);
        socket.close();
        die(`reset-dev-state failed: HTTP ${reset.status}`);
      }

      // tiny delay so DB/Redis state settles
      await new Promise((r) => setTimeout(r, 250));

      rsv = await createReservation();
    }
  }

  if (rsv.status !== 201) {
    console.error(rsv.text);
    socket.close();
    die(`Create reservation failed: HTTP ${rsv.status}`);
  }

const reservationCode = rsv.json?.reservationCode || rsv.json?.data?.reservationCode;
  if (!reservationCode) {
    socket.close();
    die("Reservation did not return reservationCode");
  }

  // 6) Confirm + check-in
  const conf = await httpJson(
    "PATCH",
    `${baseUrl}/api/v1/admin/reservations/${reservationCode}/confirm`,
    null,
    authz,
    timeoutMs,
  );
  if (conf.status < 200 || conf.status > 299) {
    console.error(conf.text);
    socket.close();
    die(`Confirm reservation failed: HTTP ${conf.status}`);
  }

  const checkin = await httpJson(
    "POST",
    `${baseUrl}/api/v1/admin/reservations/${reservationCode}/checkin`,
    null,
    authz,
    timeoutMs,
  );
  if (checkin.status < 200 || checkin.status > 299) {
    console.error(checkin.text);
    socket.close();
    die(`Check-in reservation failed: HTTP ${checkin.status}`);
  }

  const sessionKey = checkin.json?.sessionKey || checkin.json?.data?.sessionKey;
  if (!sessionKey) {
    socket.close();
    die("Check-in did not return sessionKey");
  }

  // 7) Join sessionKey room (v1)
  const sessionRoom = `sessionKey:${sessionKey}`;
  const joinSess = await new Promise((resolve) => {
    socket.emit("realtime:join.v1", { rooms: [{ room: sessionRoom, lastSeq: 0 }] }, (out) => resolve(out));
  });
  if (!joinSess || joinSess.ok !== true) {
    socket.close();
    die("Join sessionKey room (v1) failed");
  }

  // 8) Get/create cart
  const cartRes = await httpJson("POST", `${baseUrl}/api/v1/carts/session/${sessionKey}`, null, {}, timeoutMs);
  if (cartRes.status < 200 || cartRes.status > 299) {
    console.error(cartRes.text);
    socket.close();
    die(`Get/Create cart failed: HTTP ${cartRes.status}`);
  }
  const cartKey = cartRes.json?.cartKey || cartRes.json?.data?.cartKey || cartRes.json?.data?.cart?.cartKey || cartRes.json?.cart?.cartKey;
  if (!cartKey) {
    socket.close();
    die("Cart response did not return cartKey");
  }

  // 9) Trigger cart.updated
  const before = receivedEvents.length;
  const up = await httpJson(
    "PUT",
    `${baseUrl}/api/v1/carts/${cartKey}/items`,
    { itemId: String(menuItemId), quantity: 1 },
    {},
    timeoutMs,
  );
  if (![200, 204].includes(up.status)) {
    console.error(up.text);
    socket.close();
    die(`Upsert cart item failed: HTTP ${up.status}`);
  }

  const gotCartEvent = await waitFor(
    () => receivedEvents.slice(before).find((e) => String(e?.type) === "cart.updated"),
    Math.min(timeoutMs, 8000),
  );
  if (!gotCartEvent) {
    socket.close();
    die("Did not receive cart.updated event via realtime");
  }

  console.log("✅ Realtime sanity ok: received cart.updated");

  // 10) Request replay from seq=0 (should include at least the recent cart.updated in window)
  const replayRes = await new Promise((resolve) => {
    socket.emit("realtime:replay.request.v1", { room: sessionRoom, fromSeq: 0, limit: 20 }, (out) => resolve(out));
  });
  if (!replayRes || replayRes.ok !== true) {
    socket.close();
    die(`Replay request failed: ${JSON.stringify(replayRes)}`);
  }
  if ((replayRes.count || 0) < 1) {
    socket.close();
    die("Replay returned 0 items (expected >= 1)");
  }
  console.log("✅ Replay ok: got", replayRes.count, "items");

  socket.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
