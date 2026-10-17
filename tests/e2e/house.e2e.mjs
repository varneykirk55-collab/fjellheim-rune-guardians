// house.e2e.mjs - the approved Nordic house in Bjorvik: enter through its door,
// leave again, walk around it (passing behind its roof line), and its walls
// block. Real key presses; game state is only read after the initial setup.
//   npm run test:e2e:house     (E2E_URL=... to reuse a running server)
import { join } from "node:path";
import { loadPlaywright, startServer, checker, OUT } from "./harness.mjs";

const { check } = checker();
const server = await startServer(5196);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (k, hold = 120) => {
  await page.keyboard.down(k);
  await wait(hold);
  await page.keyboard.up(k);
  await wait(90);
};
const world = () =>
  page.evaluate(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    return { map: w.map?.id, x: w.pX, y: w.pY, moving: w.moving, busy: w.busy, dlg: !!w.dialogue?.active, depth: w.player?.depth };
  });
const settle = async () => {
  for (let i = 0; i < 120; i++) {
    const s = await world();
    if (!s.busy && !s.dlg && !s.moving) return s;
    if (s.dlg) await tap("KeyZ", 60);
    else await wait(60);
  }
  throw new Error("world never settled");
};
const grid = () =>
  page.evaluate(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    const W = w.map.grid[0].length, H = w.map.grid.length, blocked = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.isSolid(x, y) || w.npcs.some((n) => n.x === x && n.y === y)) blocked.push(`${x},${y}`);
    const warps = [...w.map.warps.map((q) => `${q.x},${q.y}`), ...w.map.buildings.filter((b) => b.door).map((b) => `${b.door.x},${b.door.y}`)];
    return { W, H, blocked, warps };
  });
function bfs(g, from, goal) {
  const blocked = new Set(g.blocked), warps = new Set(g.warps), k = (p) => `${p.x},${p.y}`;
  const prev = new Map([[k(from), null]]), q = [from];
  const dirs = [[0, -1, "ArrowUp"], [0, 1, "ArrowDown"], [-1, 0, "ArrowLeft"], [1, 0, "ArrowRight"]];
  while (q.length) {
    const p = q.shift();
    if (p.x === goal.x && p.y === goal.y) break;
    for (const [dx, dy, key] of dirs) {
      const n = { x: p.x + dx, y: p.y + dy }, nk = k(n);
      if (n.x < 0 || n.y < 0 || n.x >= g.W || n.y >= g.H || blocked.has(nk) || prev.has(nk) || (warps.has(nk) && nk !== k(goal))) continue;
      prev.set(nk, { p, key });
      q.push(n);
    }
  }
  if (!prev.has(k(goal))) return null;
  const keys = [];
  for (let c = goal; prev.get(k(c)); c = prev.get(k(c)).p) keys.unshift(prev.get(k(c)).key);
  return keys;
}
async function walkTo(goal) {
  for (let a = 0; a < 6; a++) {
    const s = await settle();
    if (s.x === goal.x && s.y === goal.y) return s;
    const keys = bfs(await grid(), s, goal);
    if (!keys) return s;
    for (const key of keys) {
      const b = await world();
      await tap(key);
      const n = await settle();
      if (n.map !== b.map || (n.x === b.x && n.y === b.y)) break;
    }
  }
  return settle();
}

try {
  await page.goto(server.url + "?e2e");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
  await page.evaluate(() => {
    const { Session, game } = window.__fjellheim;
    Session.startNew("Astri", "astri");
    for (const f of ["intro_done", "rival_done", "met_seer", "bergling_done"]) Session.setFlag(f);
    Session.setFlag("starter", "snowpup");
    game.scene.stop("title");
    game.scene.start("world", { map: "village", x: 9, y: 14, dir: "up" });
  });
  await wait(1000);
  let s = await settle();
  const house = await page.evaluate(() => window.__fjellheim.game.scene.getScene("world").map.buildings.find((b) => b.asset === "nordic_house"));
  check("the village uses the approved Nordic house", !!house && house.door.x === 9 && house.door.y === 11, JSON.stringify(house?.door));
  const tex = await page.evaluate(() => {
    const g = window.__fjellheim.game;
    const t = g.textures.get("nordic_house");
    return { ok: g.textures.exists("nordic_house"), w: t.getSourceImage().width, h: t.getSourceImage().height };
  });
  check("its texture loads at 160x96", tex.ok && tex.w === 160 && tex.h === 96, JSON.stringify(tex));

  // approach along the path and walk in through the door
  await page.evaluate(() => { window.__fjellheim.Audio.sfxLog.length = 0; });
  await tap("ArrowUp"); // (9,13)
  await tap("ArrowUp"); // (9,12) right below the doorstep
  s = await settle();
  await page.screenshot({ path: join(OUT, "house-approach.png") });
  check("the hero walks up the path to the doorstep", s.x === 9 && s.y === 12, `${s.x},${s.y}`);
  await tap("ArrowUp"); // onto the doorstep -> warp
  await page.waitForFunction(() => window.__fjellheim.game.scene.getScene("world").map?.id === "home", null, { timeout: 5000 });
  s = await settle();
  let log = await page.evaluate(() => [...window.__fjellheim.Audio.sfxLog]);
  check("stepping onto the doorstep enters the home", s.map === "home" && log.includes("doorIn"), `${s.map} ${log.join(",")}`);

  // and back out
  await page.evaluate(() => { window.__fjellheim.Audio.sfxLog.length = 0; });
  s = await walkTo({ x: 5, y: 8 });
  await page.waitForFunction(() => window.__fjellheim.game.scene.getScene("world").map?.id === "village", null, { timeout: 5000 });
  s = await settle();
  log = await page.evaluate(() => [...window.__fjellheim.Audio.sfxLog]);
  check("leaving the home returns below the new door", s.map === "village" && s.x === 9 && s.y === 12 && log.includes("doorOut"), `${s.map} ${s.x},${s.y} ${log.join(",")}`);

  // walk around the house: east side, then the passage behind it
  s = await walkTo({ x: 15, y: 7 });
  check("the east side of the house is walkable", s.x === 15 && s.y === 7, `${s.x},${s.y}`);
  s = await walkTo({ x: 9, y: 4 });
  check("the passage behind the house is reachable", s.x === 9 && s.y === 4, `${s.x},${s.y}`);
  await tap("ArrowDown"); // onto the sparse roof line (row 5): allowed, drawn behind the roof
  s = await settle();
  const houseDepth = await page.evaluate(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    return w.children.list.find((o) => o.texture?.key === "nordic_house")?.depth;
  });
  check("passing behind the roof line draws the hero behind the house", s.y === 5 && s.depth < houseDepth, `y=${s.y} hero depth ${s.depth} house depth ${houseDepth}`);
  await page.screenshot({ path: join(OUT, "house-behind.png") });
  for (let i = 0; i < 3; i++) await tap("ArrowDown");
  s = await settle();
  check("the house walls block (stopped on the roof line)", s.x === 9 && s.y === 5, `${s.x},${s.y}`);
  // walls block from the east too
  s = await walkTo({ x: 13, y: 8 });
  for (let i = 0; i < 3; i++) await tap("ArrowLeft");
  s = await settle();
  check("the east wall blocks", s.x === 13 && s.y === 8, `${s.x},${s.y}`);
  check("no page or console errors", errors.length === 0, errors.join(" | "));
  console.log("\nALL HOUSE CHECKS PASSED");
} catch (e) {
  console.error(String(e));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.stop();
}
