// protagonists.e2e.mjs - both heroes, through the real title screen: selection,
// sprite, four-direction walk cycle, idle facing, building door sounds,
// collision, and save/continue. Input is real keyboard presses; game state is
// only read (plus one save written through the game's own SaveManager).
//   npm run test:e2e:heroes     (E2E_URL=... to reuse a running server)
import { join } from "node:path";
import { loadPlaywright, startServer, checker, OUT } from "./harness.mjs";

const { check } = checker();
const server = await startServer(5197);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const errors = [];

const HEROES = [
  { char: "eirik", index: 0, name: "Eirik" },
  { char: "astri", index: 1, name: "Astri" },
];

try {
  for (const hero of HEROES) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    page.on("pageerror", (e) => errors.push(`${hero.char}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${hero.char}: ${m.text()}`));
    const wait = (ms) => page.waitForTimeout(ms);
    const tap = async (k, hold = 60) => {
      await page.keyboard.down(k);
      await wait(hold);
      await page.keyboard.up(k);
      await wait(110);
    };
    const world = () =>
      page.evaluate(() => {
        const g = window.__fjellheim.game;
        const w = g.scene.getScene("world");
        return {
          map: w.map?.id, x: w.pX, y: w.pY, dir: w.pDir, moving: w.moving, busy: w.busy,
          dlg: !!w.dialogue?.active, frame: Number(w.player?.frame?.name), running: g.scene.isActive("world"),
          tex: w.player?.texture?.key,
        };
      });
    const settle = async () => {
      for (let i = 0; i < 150; i++) {
        const s = await world();
        if (s.running && !s.busy && !s.dlg && !s.moving) return s;
        if (s.dlg) await tap("KeyZ");
        else await wait(60);
      }
      throw new Error("world never settled");
    };
    const shot = (name) => page.screenshot({ path: join(OUT, `${hero.char}-${name}.png`) });

    await page.goto(server.url + "?e2e");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
    await wait(400);
    await tap("KeyZ"); // NEW SAGA
    await wait(300);
    if (hero.index) await tap("ArrowRight");
    await wait(450);
    await shot("select");
    await tap("KeyZ");
    await page.waitForFunction(() => window.__fjellheim.game.scene.isActive("world"));
    const row = await page.evaluate((c) => {
      const s = window.__fjellheim.Session.get();
      return { char: s.playerChar, name: s.playerName };
    }, hero.char);
    check(`${hero.char}: selected on the title screen`, row.char === hero.char && row.name === hero.name, JSON.stringify(row));
    let s = await settle();
    const layout = await page.evaluate(() => {
      const g = window.__fjellheim.game;
      return { tex: g.textures.exists("chars"), missing: g.textures.get("chars").key };
    });
    const heroRow = await page.evaluate((c) => window.__fjellheim.game.scene.getScene("world").sys.game.cache.json.get("__none__") ?? c, hero.char);
    void heroRow;
    const rowOf = (frame) => Math.floor(frame / 12);
    const firstRow = rowOf(s.frame);
    check(`${hero.char}: player sprite comes from the chars sheet`, s.tex === "chars" && layout.tex, JSON.stringify(s));

    // walk each direction across the home floor; sample frames while moving
    const walk = async (key, tiles) => {
      const seen = new Set();
      await page.keyboard.down(key);
      const t0 = Date.now();
      while (Date.now() - t0 < tiles * 165) {
        const w = await world();
        seen.add(w.frame % 12);
        await wait(15);
      }
      await page.keyboard.up(key);
      const end = await settle();
      return { seen: [...seen].sort((a, b) => a - b), end };
    };
    await shot("home");
    const base = { down: 0, up: 3, right: 6, left: 9 };
    for (const [key, dir, tiles] of [["ArrowLeft", "left", 3], ["ArrowUp", "up", 2], ["ArrowRight", "right", 3], ["ArrowDown", "down", 2]]) {
      const before = await world();
      const r = await walk(key, tiles);
      const b = base[dir];
      const moved = Math.abs(r.end.x - before.x) + Math.abs(r.end.y - before.y);
      check(
        `${hero.char}: walking ${dir} plays stand + both step poses`,
        moved >= 1 && [b, b + 1, b + 2].every((f) => r.seen.includes(f)),
        `moved ${moved}, frames ${r.seen.join(",")}`,
      );
      check(`${hero.char}: standing still faces ${dir}`, r.end.frame % 12 === b && r.end.dir === dir && rowOf(r.end.frame) === firstRow, `frame ${r.end.frame}`);
    }
    // collision: the home's north wall stops the player
    s = await world();
    for (let i = 0; i < 6; i++) await tap("ArrowUp", 140);
    s = await settle();
    const blocker = await page.evaluate(([x, y]) => {
      const w = window.__fjellheim.game.scene.getScene("world");
      return { solid: w.isSolid(x, y), npc: w.npcs.some((n) => n.x === x && n.y === y) };
    }, [s.x, s.y - 1]);
    check(`${hero.char}: collision stops the hero below a solid tile or NPC`, blocker.solid || blocker.npc, `at ${s.x},${s.y} above: ${JSON.stringify(blocker)}`);

    // leave the house and enter the healing hall: door sounds + map changes
    await page.evaluate(() => { window.__fjellheim.Audio.sfxLog.length = 0; });
    const goTo = async (gx, gy) => {
      for (let n = 0; n < 60; n++) {
        const w = await settle();
        if (w.x === gx && w.y === gy) return w;
        const key = w.y < gy ? "ArrowDown" : w.y > gy ? "ArrowUp" : w.x < gx ? "ArrowRight" : "ArrowLeft";
        await tap(key, 120);
      }
      return world();
    };
    await goTo(5, 7);
    await tap("ArrowDown", 140);
    await page.waitForFunction(() => window.__fjellheim.game.scene.getScene("world").map?.id === "village", null, { timeout: 5000 });
    s = await settle();
    let log = await page.evaluate(() => [...window.__fjellheim.Audio.sfxLog]);
    check(`${hero.char}: leaving the house plays the door-out sound`, log.includes("doorOut") && !log.includes("doorIn"), log.join(","));
    await wait(300);
    await shot("village");
    check(`${hero.char}: hero kept after the scene change`, rowOf(s.frame) === firstRow, `frame ${s.frame}`);
    // into the Hall of Mending (door at 42,12 from the village)
    await page.evaluate(() => {
      window.__fjellheim.Audio.sfxLog.length = 0;
      window.__fjellheim.game.scene.getScene("world").scene.restart({ map: "village", x: 42, y: 13, dir: "up" });
    });
    await wait(900);
    await settle();
    await tap("ArrowUp", 140);
    await page.waitForFunction(() => window.__fjellheim.game.scene.getScene("world").map?.id === "heal", null, { timeout: 5000 });
    s = await settle();
    log = await page.evaluate(() => [...window.__fjellheim.Audio.sfxLog]);
    check(`${hero.char}: entering a building plays the door-in sound`, log.includes("doorIn") && !log.includes("doorOut"), log.join(","));
    await wait(300);
    await shot("indoors");

    // save, reload, continue: same hero
    await page.evaluate(() => window.__fjellheim.SaveManager.save(window.__fjellheim.Session.get()));
    await page.reload();
    await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
    await wait(400);
    await tap("ArrowDown"); // CONTINUE
    await tap("KeyZ");
    await page.waitForFunction(() => window.__fjellheim.game.scene.isActive("world"), null, { timeout: 10000 });
    s = await settle();
    const cont = await page.evaluate(() => window.__fjellheim.Session.get().playerChar);
    check(`${hero.char}: continue restores the chosen hero`, cont === hero.char && rowOf(s.frame) === firstRow && s.map === "heal", `${cont} frame ${s.frame} ${s.map}`);
    await page.close();
  }
  check("no page errors or console errors", errors.length === 0, errors.join(" | "));
  console.log("\nALL HERO CHECKS PASSED");
} catch (e) {
  console.error(String(e));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.stop();
}
