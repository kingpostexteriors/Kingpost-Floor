import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const kids: { bridge?: ChildProcess; send?: ChildProcess } = {};

function jimDir() {
  return process.env.KINGPOST_JIM_DIR?.trim() || path.join(process.cwd(), "KingpostJim");
}
function pythonBin() {
  const venv = path.join(jimDir(), ".venv", "Scripts", "python.exe");
  if (existsSync(venv)) return venv;
  return "python";
}
function script(...names: string[]) {
  const dir = jimDir();
  return names.map((n) => path.join(dir, n)).find((p) => existsSync(p));
}
function run(pyFile: string, detached: boolean) {
  const child = spawn(pythonBin(), [pyFile], {
    cwd: jimDir(),
    windowsHide: true,
    stdio: "ignore",
    detached,
  });
  child.on("error", () => {});
  if (detached) child.unref();
  return child;
}

export async function startHermes() {
  const dir = jimDir();
  await writeFile(path.join(dir, "poller_control.json"), JSON.stringify({ paused: false, running: true }), "utf8");
  const bridge = script("gmail_bridge.py", "jim_poller.py", "hermes.py");
  const send = script("send_approved.py");
  if (bridge && !kids.bridge) kids.bridge = run(bridge, true);
  if (send && !kids.send) kids.send = run(send, true);
  return { jimDir: dir, bridge: bridge ?? "missing", send: send ?? "missing" };
}

export async function stopHermes() {
  const dir = jimDir();
  await writeFile(path.join(dir, "poller_control.json"), JSON.stringify({ paused: true, running: false }), "utf8");
  for (const k of ["bridge", "send"] as const) {
    try { kids[k]?.kill(); } catch { /* gone */ }
    kids[k] = undefined;
  }
}

export async function sendApprovedNow() {
  const send = script("send_approved.py");
  if (!send) return { ok: false, reason: "send_approved.py not in KingpostJim" };
  const child = run(send, false);
  return await new Promise<{ ok: boolean; reason: string }>((resolve) => {
    const t = setTimeout(() => resolve({ ok: true, reason: "send started" }), 4000);
    child.on("exit", (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0 || code == null, reason: "send_approved exit " + String(code) });
    });
    child.on("error", () => {
      clearTimeout(t);
      resolve({ ok: false, reason: "could not start python" });
    });
  });
}
