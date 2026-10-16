// opening.e2e.mjs - browser playthrough of the opening sequence, driven by
// real keyboard input (the game state is only *read* through the ?e2e hook,
// never written). Run with:  npm run test:e2e
//
//   E2E_URL=http://localhost:5180/  reuse a running dev/preview server
//   (otherwise the game is built and served with `vite preview` on port 5199)
//
// Playwright is not a project dependency: the script uses a local install if
// present, else the global one (`npm i -g playwright`, chromium installed).
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = join(HERE, "..", "..");
const OUT = join(GAME, "test-results", "e2e");
mkdirSync(OUT, { recursive: true });

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const root = execSync("npm root -g").toString().trim();
    return createRequire(join(root, "noop.js"))("playwright");
  }
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
  if (!ok) throw new Error(`check failed: ${name} ${detail}`);
}

async function startServer() {
  if (process.env.E2E_URL) return { url: process.env.E2E_URL, stop() {} };
  // Test the production bundle: a fresh dev server may force a full page reload
  // mid-run when its dependency optimiser discovers imports, which resets the game.
  execSync("npx vite build", { cwd: GAME, stdio: "ignore" });
  // own process group, so stop() also ends the vite child that npx spawns
  const proc = spawn("npx", ["vite", "preview", "--port", "5199", "--strictPort", "--host", "127.0.0.1"], { cwd: GAME, stdio: "pipe", detached: true });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("vite did not start")), 30000);
    proc.stdout.on("data", (d) => {
      if (String(d).includes("Local:")) {
        clearTimeout(t);
        resolve();
      }
    });
  });
  return {
    url: "http://127.0.0.1:5199/",
    stop: () => {
      try {
        process.kill(-proc.pid, "SIGTERM");
      } catch {
        proc.kill();
      }
    },
  };
}

const server = await startServer();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
async function tap(key, hold = 60) {
  await page.keyboard.down(key);
  await wait(hold);
  await page.keyboard.up(key);
  await wait(90);
}

/* ------------------------------------------------------------ state reads */
const world = () =>
  ev(() => {
    const g = window.__fjellheim.game;
    const w = g.scene.getScene("world");
    return {
      map: w.map?.id,
      x: w.pX,
      y: w.pY,
      dir: w.pDir,
      moving: w.moving,
      busy: w.busy,
      dlg: !!w.dialogue?.active,
      ui: !!w.uiTick,
      running: g.scene.isActive("world"),
      visible: w.sys.settings.visible,
      battle: g.scene.isActive("battle"),
      pause: g.scene.isActive("pause"),
    };
  });
const session = () => ev(() => JSON.parse(JSON.stringify(window.__fjellheim.Session.get())));
const battle = () =>
  ev(() => {
    const b = window.__fjellheim.game.scene.getScene("battle");
    const e = b.engine;
    return {
      mode: b.mode,
      menuIndex: b.menuIndex,
      bagIndex: b.bagIndex,
      kind: b.config?.kind,
      bag: b.bagItems ? b.bagItems() : [],
      enemy: e?.active("enemy")?.speciesId,
      enemyHp: b.enemyHpBar ? b.enemyHpBar.width / 56 : 1, // HP bar fill ratio (bar is 56px wide)
      override: !!b.uiOverride,
    };
  });

const shotsTaken = new Set();
/** wait until the world is idle and in control of the player */
async function settle(policy, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await world();
    if (s.battle) {
      await fightBattle(policy);
      continue;
    }
    if (!s.running) {
      await wait(100);
      continue;
    }
    if (s.ui) {
      if (!shotsTaken.has("starter")) {
        shotsTaken.add("starter");
        await wait(400);
        await shot("05a-starter-choice");
        const p = await session();
        check("starter choice waits for the player (regression: closing line auto-picked #1)", p.party.length === 0 && !p.flags.starter);
        await tap("ArrowRight"); // browse to the second guardian
      }
      await tap("KeyZ"); // choose the highlighted starter
      continue;
    }
    if (s.dlg) {
      await tap("KeyZ");
      continue;
    }
    if (s.busy || s.moving) {
      await wait(80);
      continue;
    }
    await wait(120);
    const s2 = await world();
    if (!s2.busy && !s2.dlg && !s2.ui && !s2.battle && s2.running) return s2;
  }
  throw new Error("settle timeout " + JSON.stringify(await world()));
}

/* ------------------------------------------------------------ battles */
const battleLog = [];
async function moveMenuTo(target) {
  for (let i = 0; i < 4; i++) {
    const b = await battle();
    if (b.menuIndex === target) return;
    await tap("ArrowRight");
  }
}
async function fightBattle(policy = {}) {
  const info = await battle();
  battleLog.push({ kind: info.kind, enemy: info.enemy });
  for (let guard = 0; guard < 600; guard++) {
    const w = await world();
    if (!w.battle) return;
    const b = await battle();
    if (b.override) {
      await tap("KeyX"); // decline move-forget prompts
    } else if (b.mode === "menu") {
      if (!shotsTaken.has(`battle-${battleLog.length}`)) {
        shotsTaken.add(`battle-${battleLog.length}`);
        await shot(`battle-${battleLog.length}-${b.kind}-${b.enemy}`);
      }
      // play it like the walkthrough says: weaken the target first, then throw
      const target = policy.catchSpecies && b.kind === "wild" && b.enemy === policy.catchSpecies;
      const wantBall = target && b.bag.includes("rune_ball") && b.enemyHp <= 0.5;
      const wantRun = policy.runFromWild && b.kind === "wild" && b.enemy !== policy.catchSpecies;
      if (wantBall) {
        await moveMenuTo(1);
        await tap("KeyZ");
      } else if (wantRun) {
        await moveMenuTo(3);
        await tap("KeyZ");
      } else {
        await moveMenuTo(0);
        await tap("KeyZ");
      }
    } else if (b.mode === "moves") {
      await tap("KeyZ"); // first move
    } else if (b.mode === "bag") {
      const want = b.bag.indexOf("rune_ball");
      if (want < 0) await tap("KeyX"); // nothing to throw (or menu mis-step): back out
      else if (b.bagIndex !== want) await tap("ArrowDown");
      else await tap("KeyZ");
    } else if (b.mode === "switch") {
      await tap("ArrowDown");
      await tap("KeyZ");
    } else {
      await tap("KeyZ"); // advance messages
    }
  }
  throw new Error("battle did not finish");
}

/* ------------------------------------------------------------ walking */
async function grid() {
  return ev(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    const W = w.map.grid[0].length;
    const H = w.map.grid.length;
    const blocked = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.isSolid(x, y) || w.npcs.some((n) => n.x === x && n.y === y)) blocked.push(`${x},${y}`);
    const warps = [...w.map.warps.map((q) => `${q.x},${q.y}`), ...w.map.buildings.filter((b) => b.door).map((b) => `${b.door.x},${b.door.y}`)];
    return { W, H, blocked, warps };
  });
}
function bfs(g, from, goal) {
  const blocked = new Set(g.blocked);
  const warps = new Set(g.warps);
  const k = (p) => `${p.x},${p.y}`;
  const prev = new Map([[k(from), null]]);
  const q = [from];
  const dirs = [
    [0, -1, "ArrowUp"],
    [0, 1, "ArrowDown"],
    [-1, 0, "ArrowLeft"],
    [1, 0, "ArrowRight"],
  ];
  while (q.length) {
    const p = q.shift();
    if (p.x === goal.x && p.y === goal.y) break;
    for (const [dx, dy, key] of dirs) {
      const n = { x: p.x + dx, y: p.y + dy };
      const nk = k(n);
      if (n.x < 0 || n.y < 0 || n.x >= g.W || n.y >= g.H || blocked.has(nk) || prev.has(nk)) continue;
      if (warps.has(nk) && !(n.x === goal.x && n.y === goal.y)) continue;
      prev.set(nk, { p, key });
      q.push(n);
    }
  }
  if (!prev.has(k(goal))) return null;
  const keys = [];
  for (let cur = goal; prev.get(k(cur)); cur = prev.get(k(cur)).p) keys.unshift(prev.get(k(cur)).key);
  return keys;
}
/** walk to (x,y) on the current map with real key presses; re-plans after interruptions */
async function walkTo(goal, policy = {}, opts = {}) {
  const startMap = (await world()).map;
  for (let attempt = 0; attempt < 12; attempt++) {
    let s = await settle(policy);
    // a warp was taken (story may have moved us on again, e.g. a blackout)
    if (opts.untilMap && s.map !== startMap) return s;
    if (s.x === goal.x && s.y === goal.y) return s;
    const keys = bfs(await grid(), s, goal);
    if (!keys) throw new Error(`no path on ${s.map} from ${s.x},${s.y} to ${goal.x},${goal.y}`);
    for (const key of keys) {
      const before = await world();
      await tap(key);
      for (let i = 0; i < 20; i++) {
        const now = await world();
        if (!now.moving) break;
        await wait(40);
      }
      const after = await world();
      if (after.map !== before.map || after.busy || after.dlg || after.battle || !after.running) break; // warp/event/encounter
      if (after.x === before.x && after.y === before.y) break; // blocked: re-plan
    }
  }
  const s = await settle(policy);
  if (opts.untilMap ? s.map !== opts.untilMap : s.x !== goal.x || s.y !== goal.y) throw new Error(`walkTo failed: ${JSON.stringify(s)}`);
  return s;
}
async function face(dirKey) {
  await tap(dirKey, 30);
  await settle();
}
async function enter(map, warp, policy) {
  return walkTo(warp, policy, { untilMap: map });
}
/** exits of each interior back to the village, and the village gate */
const TO_VILLAGE = { home: { x: 5, y: 8 }, heal: { x: 5, y: 8 }, shop: { x: 5, y: 8 }, seer: { x: 8, y: 11 }, route1: { x: 35, y: 25 } };
async function goTo(map, policy = { runFromWild: true }) {
  for (let i = 0; i < 8; i++) {
    let s = await settle(policy);
    if (s.map === map) return s;
    if (s.map !== "village") s = await enter("village", TO_VILLAGE[s.map], policy);
    else if (map === "route1") s = await enter("route1", { x: 25, y: 1 }, policy);
  }
  throw new Error(`could not reach ${map}`);
}

/* ============================================================ scenario */
try {
  await page.goto(server.url + "?e2e");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
  await wait(400);

  // 1. start a new game
  await tap("KeyZ"); // NEW SAGA
  await wait(200);
  await tap("KeyZ"); // EIRIK
  await page.waitForFunction(() => window.__fjellheim.game.scene.isActive("world"));
  let s = await settle();
  let st = await session();
  check("1. new game starts at home after intro", s.map === "home" && st.flags.intro_done === true, JSON.stringify({ map: s.map, x: s.x, y: s.y }));
  await shot("01-home");

  // movement with a held key (regression: idle touch pad erased held keys)
  await page.keyboard.down("ArrowUp");
  await wait(450);
  await page.keyboard.up("ArrowUp");
  s = await settle();
  check("held arrow key walks several tiles", s.y <= 4, `y=${s.y}`);

  // talk to mother and make sure the conversation ends (regression: re-opened forever)
  s = await walkTo({ x: 5, y: 4 });
  await face("ArrowUp");
  await tap("KeyZ");
  s = await world();
  check("talking to mother opens dialogue", s.dlg);
  s = await settle();
  await wait(300);
  s = await world();
  check("dialogue closes and stays closed", !s.dlg && !s.busy);

  // pause menu open/close (regression: world stayed invisible after resume())
  await tap("Enter");
  await wait(300);
  check("pause menu opens", (await world()).pause);
  await tap("KeyX");
  await wait(300);
  s = await world();
  check("closing pause returns a visible, running world", s.visible && s.running && !s.pause);

  // 2. exit the starting house
  s = await enter("village", { x: 5, y: 8 });
  check("2. exited the house into the village", s.map === "village", `${s.x},${s.y}`);
  await shot("02-village");
  const animOk = await ev(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    return { npcs: w.npcs.map((n) => n.id), hearthHere: w.animTiles.has("hearth") };
  });
  check("no leftover NPCs/animated tiles from the previous room", !animOk.hearthHere && !animOk.npcs.includes("mother"), JSON.stringify(animOk));

  // 3. navigate the village: the north gate turns you back without a creature
  s = await walkTo({ x: 25, y: 3 });
  check("north gate reachable on foot (regression: longhouse sealed the road)", s.x === 25 && s.y === 3);
  await tap("ArrowUp");
  await page.waitForFunction(() => window.__fjellheim.game.scene.getScene("world").dialogue.active, null, { timeout: 5000 });
  await wait(500);
  await shot("03-gate-guard");
  const pinned = await ev(() => {
    const w = window.__fjellheim.game.scene.getScene("world");
    return { dialogue: w.dialogue.container.scrollFactorX, scrolled: w.cameras.main.scrollX };
  });
  check("dialogue box is screen-pinned on a scrolled map (regression: drawn off-screen)", pinned.dialogue === 0 && pinned.scrolled > 0, JSON.stringify(pinned));
  s = await settle();
  st = await session();
  check("3. gate guard stops a player without a starter", s.map === "village" && s.y >= 3 && st.party.length === 0, `${s.map} ${s.x},${s.y}`);

  // 4. enter the seer's longhouse (starter event + 5. starter + 6. rival battle run inside settle())
  s = await enter("seer", { x: 25, y: 10 });
  s = await settle({}, 120000);
  st = await session();
  check("4. entered the seer's longhouse", s.map === "seer" || s.map === "heal", s.map);
  check("5. a starter was chosen (browsed with arrows)", st.party.length === 1 && st.flags.starter === "snowpup", String(st.flags.starter));
  await shot("05-after-rival");

  // 6. if the rival won, the lose-branch must have run after the blackout; rematch until won
  for (let tries = 0; !st.flags.rival_done && tries < 4; tries++) {
    check("rival loss sets rival_pending (blackout continuation ran)", st.flags.rival_pending === true && s.map === "heal");
    s = await enter("village", { x: 5, y: 8 });
    s = await enter("seer", { x: 25, y: 10 });
    s = await walkTo({ x: 9, y: 3 }); // the pedestal row blocks the front; speak from her side
    await face("ArrowLeft");
    await tap("KeyZ");
    s = await settle({}, 120000);
    st = await session();
  }
  check("6. rival battle completed (won)", st.flags.rival_done === true && (st.bag.items.rune_ball ?? 0) >= 8, `balls=${st.bag.items.rune_ball}`);

  // 7. reach the first route
  s = await goTo("route1");
  check("7. reached Whisperpine Path", s.map === "route1", `${s.x},${s.y}`);
  await shot("07-route1");

  // 8. encounter and capture a wild creature (the frightened Bergling event)
  const policy = { catchSpecies: "bergling", runFromWild: true };
  // capture is random (the Bergling can be knocked out, resist the ball, or win);
  // allow enough attempts that a fair player always gets there
  for (let tries = 0; tries < 10 && !(await session()).flags.bergling_done; tries++) {
    s = await settle(policy);
    if (s.map !== "route1") s = await goTo("route1", policy); // e.g. after a blackout
    // step into the trigger area (24..30 x 10..14) along the path row
    await walkTo({ x: 30, y: 12 }, policy).catch(() => null);
    await walkTo({ x: 28, y: 12 }, policy).catch(() => null);
    s = await settle(policy, 120000);
  }
  st = await session();
  check("8. Bergling captured into the party", st.flags.bergling_done === true && st.party.some((c) => c.speciesId === "bergling"), `party=${st.party.map((c) => c.speciesId)}`);
  check("capture recorded in stats", st.stats.captures >= 1);
  await shot("08-captured");

  // 9. return to the village
  s = await goTo("village"); // also recovers from a blackout on the way
  check("9. returned to the village", s.map === "village", `${s.x},${s.y}`);

  // 10. heal the party (talk to the healer across the counter)
  s = await enter("heal", { x: 42, y: 12 });
  s = await walkTo({ x: 8, y: 4 });
  await face("ArrowUp");
  await tap("KeyZ");
  s = await settle();
  st = await session();
  const fullHp = await ev(() => {
    const st = window.__fjellheim.Session.get();
    const g = window.__fjellheim.game.scene.getScene("world");
    void g;
    return st.party.every((c) => c.hp > 0 && c.status === null && c.moves.every((m) => m.pp > 0));
  });
  check("10. party healed by the healer (talked across the counter)", st.flags.healed_once === true && fullHp);
  await shot("10-healed");

  // 11. save via the pause menu, reload the page, continue
  await tap("Enter");
  await wait(300);
  await tap("ArrowDown");
  await tap("ArrowDown"); // SAVE
  await tap("KeyZ");
  await wait(200);
  await tap("KeyZ"); // confirm
  await wait(400);
  const saved = await ev(() => localStorage.getItem("fjellheim.save"));
  check("11a. save written", !!saved);
  await tap("KeyX");
  await wait(300);
  const before = await session();
  await page.reload();
  await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
  await wait(400);
  await tap("ArrowDown"); // CONTINUE
  await tap("KeyZ");
  await page.waitForFunction(() => window.__fjellheim.game.scene.isActive("world"));
  s = await settle();
  st = await session();
  check(
    "11b. reload restores map, position, party, bag and flags",
    s.map === before.pos.map &&
      s.x === before.pos.x &&
      s.y === before.pos.y &&
      st.party.length === before.party.length &&
      JSON.stringify(st.bag) === JSON.stringify(before.bag) &&
      st.flags.bergling_done === true,
    `${s.map} ${s.x},${s.y} party=${st.party.length}`,
  );
  await shot("11-reloaded");

  // the continued game is playable: walk out of the hall
  s = await enter("village", { x: 5, y: 8 });
  check("continued game is playable (left the hall)", s.map === "village");

  check("no page errors during the playthrough", errors.length === 0, errors.join(" | "));
  console.log(`\nbattles fought: ${JSON.stringify(battleLog)}`);
  console.log(`\nALL ${results.length} CHECKS PASSED`);
} catch (e) {
  console.error("\nE2E FAILED:", e.message);
  if (errors.length) console.error("page errors:", errors);
  await shot("failure").catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  server.stop();
}
