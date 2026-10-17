// harness.mjs - shared setup for the browser tests: Playwright loading, a
// production-build preview server, and pass/fail bookkeeping.
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const GAME = join(HERE, "..", "..");
export const OUT = join(GAME, "test-results", "e2e");
mkdirSync(OUT, { recursive: true });

export async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const root = execSync("npm root -g").toString().trim();
    return createRequire(join(root, "noop.js"))("playwright");
  }
}

export function checker() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
    if (!ok) throw new Error(`check failed: ${name} ${detail}`);
  };
  return { results, check };
}

/** E2E_URL reuses a running server; otherwise build and `vite preview` on `port` */
export async function startServer(port) {
  if (process.env.E2E_URL) return { url: process.env.E2E_URL, stop() {} };
  execSync("npx vite build", { cwd: GAME, stdio: "ignore" });
  const proc = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: GAME, stdio: "pipe", detached: true });
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
    url: `http://127.0.0.1:${port}/`,
    stop: () => {
      try {
        process.kill(-proc.pid, "SIGTERM");
      } catch {
        proc.kill();
      }
    },
  };
}
