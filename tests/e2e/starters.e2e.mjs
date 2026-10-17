// starters.e2e.mjs - the seer's starter choice grants exactly the creature the
// player picked, with keyboard, mouse and touch. Setup jumps the story to the
// seer's longhouse; the choice itself is made with real input events.
//   npm run test:e2e:starters     (E2E_URL=... to reuse a running server)
import { loadPlaywright, startServer, checker } from "./harness.mjs";

const { check } = checker();
const server = await startServer(5198);
const { chromium, devices } = await loadPlaywright();
const browser = await chromium.launch();
const errors = [];

async function openChoice(page) {
  await page.goto(server.url + "?e2e");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__fjellheim?.game.scene.isActive("title"), null, { timeout: 30000 });
  await page.evaluate(() => {
    const { Session, game } = window.__fjellheim;
    Session.startNew("Eirik", "eirik");
    Session.setFlag("intro_done");
    game.scene.stop("title");
    game.scene.start("world", { map: "seer", x: 8, y: 9, dir: "up" });
  });
  // advance the seer's lines with Z until the starter menu owns input
  for (let i = 0; i < 80; i++) {
    const s = await page.evaluate(() => {
      const w = window.__fjellheim.game.scene.getScene("world");
      return { ui: !!w.uiTick, dlg: !!w.dialogue?.active, busy: w.busy };
    });
    if (s.ui && !s.dlg) return;
    if (s.dlg) {
      await page.keyboard.press("KeyZ");
    }
    await page.waitForTimeout(120);
  }
  throw new Error("starter menu never opened");
}
const party = (page) => page.evaluate(() => {
  const st = window.__fjellheim.Session.get();
  return { party: st.party.map((c) => c.speciesId), flag: st.flags.starter };
});
async function waitChosen(page) {
  for (let i = 0; i < 40; i++) {
    const p = await party(page);
    if (p.party.length) return p;
    await page.waitForTimeout(100);
  }
  return party(page);
}
const want = ["embercub", "snowpup", "stormchick"];

try {
  // keyboard: browse with arrows, confirm with Z
  for (const [i, id] of want.entries()) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    page.on("pageerror", (e) => errors.push(e.message));
    await openChoice(page);
    for (let k = 0; k < i; k++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(90);
    }
    await page.keyboard.press("KeyZ");
    const p = await waitChosen(page);
    await page.waitForTimeout(400);
    const after = await party(page);
    check(`keyboard: choosing ${id} grants exactly ${id}`, after.party.length === 1 && after.party[0] === id && after.flag === id, JSON.stringify(after));
    await page.close();
    void p;
  }
  // keyboard wrap-around: LEFT from the first entry reaches the last
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    await openChoice(page);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(90);
    await page.keyboard.press("KeyZ");
    const p = await waitChosen(page);
    check("keyboard: LEFT wraps to stormchick", p.party.join() === "stormchick", JSON.stringify(p));
    await page.close();
  }
  // mouse: hover a creature, keyboard-browse elsewhere, then press Z - the key choice wins
  // only if the pointer did not move; clicking a creature chooses it
  const spritePos = (page, i) => page.evaluate((i) => {
    const c = document.querySelector("canvas").getBoundingClientRect();
    return { x: c.left + ((140 + i * 116) / 512) * c.width, y: c.top + (100 / 288) * c.height };
  }, i);
  for (const [i, id] of want.entries()) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    await openChoice(page);
    const pos = await spritePos(page, i);
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(100);
    await page.mouse.click(pos.x, pos.y);
    const p = await waitChosen(page);
    await page.waitForTimeout(300);
    const after = await party(page);
    check(`mouse: clicking ${id} grants exactly ${id}`, after.party.length === 1 && after.party[0] === id, JSON.stringify(after));
    await page.close();
    void p;
  }
  {
    // pointer resting on embercub while the player browses to stormchick with the keys
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    await openChoice(page);
    const pos = await spritePos(page, 0);
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(100);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(90);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(90);
    await page.mouse.move(pos.x + 2, pos.y + 1); // a nudge of the resting pointer
    await page.waitForTimeout(90);
    await page.keyboard.press("KeyZ");
    const p = await waitChosen(page);
    check("mouse resting on a creature does not override the keyboard choice", p.party.join() === "stormchick", JSON.stringify(p));
    await page.close();
  }
  // touch: the first tap only selects (shows the creature's details), a second tap confirms
  for (const [i, id] of want.entries()) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await openChoice(page);
    const pos = await page.evaluate((i) => {
      const c = document.querySelector("canvas").getBoundingClientRect();
      return { x: c.left + ((140 + i * 116) / 512) * c.width, y: c.top + (100 / 288) * c.height };
    }, i);
    const cdp = await ctx.newCDPSession(page);
    const tapAt = async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pos.x, y: pos.y }] });
      await page.waitForTimeout(80);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(200);
    };
    // tap a different creature first: browsing must not choose it
    const other = (i + 1) % 3;
    const opos = await page.evaluate((i) => {
      const c = document.querySelector("canvas").getBoundingClientRect();
      return { x: c.left + ((140 + i * 116) / 512) * c.width, y: c.top + (100 / 288) * c.height };
    }, other);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: opos.x, y: opos.y }] });
    await page.waitForTimeout(80);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
    const browsing = await party(page);
    check(`touch: tapping ${want[other]} once only selects it`, browsing.party.length === 0, JSON.stringify(browsing));
    await tapAt();
    await tapAt();
    const p = await waitChosen(page);
    await page.waitForTimeout(300);
    const after = await party(page);
    check(`touch: tap-tap on ${id} grants exactly ${id}`, after.party.length === 1 && after.party[0] === id, JSON.stringify(after));
    await ctx.close();
    void p;
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
  console.log("\nALL STARTER CHECKS PASSED");
} catch (e) {
  console.error(String(e));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.stop();
}
