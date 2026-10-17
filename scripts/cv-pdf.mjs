// Renders the /cv page to public/Mekin-Jemal-CV.pdf with headless Chrome, Edge, or Firefox.
// Usage: npm run build && npm run cv:pdf   (then rebuild so the new PDF is served)
import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const target = resolve("public/Mekin-Jemal-CV.pdf");
// 46xx ports can be reserved on Windows (Hyper-V); 4421 is free on most machines.
const port = Number(process.env.CV_PORT || 4421);
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

if (!existsSync(resolve(process.env.NEXT_DIST_DIR || ".next", "BUILD_ID"))) {
  console.error("No production build found - run `npm run build` first.");
  process.exit(1);
}

const browsers = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = browsers.find((b) => existsSync(b));
const geckodrivers = [
  process.env.GECKODRIVER_PATH,
  ...((process.env.PATH || "").split(delimiter).map((dir) => join(dir, "geckodriver"))),
  "/snap/bin/geckodriver",
].filter(Boolean);
const geckodriver = geckodrivers.find((b) => existsSync(b));
if (!browser && !geckodriver) {
  console.error("No Chrome/Edge or Firefox WebDriver found. Set CHROME_PATH or GECKODRIVER_PATH.");
  process.exit(1);
}

const server = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port)], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);

const url = `http://localhost:${port}${base}/cv/`;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      /* not up yet */
    }
    if (i > 60) throw new Error("Server didn't start.");
    await new Promise((r) => setTimeout(r, 500));
  }

  if (browser) {
    await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(
        browser,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          `--user-data-dir=${mkdtempSync(join(tmpdir(), "cv-pdf-"))}`,
          "--no-pdf-header-footer",
          "--force-color-profile=srgb",
          "--virtual-time-budget=4000",
          `--print-to-pdf=${target}`,
          url,
        ],
        { stdio: "inherit" },
      );
      const timer = setTimeout(() => child.kill(), 60_000);
      child.once("error", rejectPromise);
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0 && existsSync(target)) resolvePromise();
        else rejectPromise(new Error("PDF generation failed."));
      });
    });
  } else if (geckodriver) {
    const driverPort = Number(process.env.CV_WEBDRIVER_PORT || port + 1);
    const driver = spawn(geckodriver, ["--host", "127.0.0.1", "--port", String(driverPort)], { stdio: "ignore" });
    let sessionId;
    const request = async (method, route, body) => {
      const response = await fetch(`http://127.0.0.1:${driverPort}${route}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result));
      return result.value;
    };

    try {
      for (let i = 0; ; i++) {
        try {
          await request("GET", "/status");
          break;
        } catch {
          if (i > 60) throw new Error("Firefox WebDriver didn't start.");
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      const created = await request("POST", "/session", {
        capabilities: { alwaysMatch: { browserName: "firefox", "moz:firefoxOptions": { args: ["-headless"] } } },
      });
      sessionId = created.sessionId;
      if (!sessionId) throw new Error("Firefox WebDriver did not return a session ID.");
      await request("POST", `/session/${sessionId}/url`, { url });
      await new Promise((r) => setTimeout(r, 3000));
      const pdf = await request("POST", `/session/${sessionId}/print`, {});
      if (typeof pdf !== "string") throw new Error("Firefox returned no PDF data.");
      writeFileSync(target, Buffer.from(pdf, "base64"));
    } finally {
      if (sessionId) {
        try {
          await request("DELETE", `/session/${sessionId}`);
        } catch (error) {
          console.warn("Firefox WebDriver cleanup failed.", error);
        }
      }
      driver.kill();
    }
  }
  if (!existsSync(target)) throw new Error("PDF output file was not created.");
} finally {
  stop();
}

console.log(`Wrote ${target} (${Math.round(statSync(target).size / 1024)} KB)`);
