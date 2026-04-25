/**
 * ELECTRON MAIN PROCESS
 * Dev mode  → spawns Python uvicorn + Next.js dev server
 * Prod mode → runs backend.exe + serves built Next.js via express
 */
const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const log = require("electron-log");

// ─── Config ───────────────────────────────────────────────────────────────────
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;
const BACKEND_URL  = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const isDev = process.argv.includes("--dev") || !app.isPackaged;

let mainWindow    = null;
let tray          = null;
let backendProc   = null;
let frontendProc  = null;

log.transports.file.level = "info";
log.info(`[App] isDev=${isDev}, packaged=${app.isPackaged}`);

// ─── Paths ────────────────────────────────────────────────────────────────────

function getBackendExePath() {
  if (isDev) return null; // dev uses python
  return path.join(process.resourcesPath, "backend", "ai-assistant-backend.exe");
}

function getBackendDir() {
  if (isDev) return path.join(__dirname, "../../backend");
  return path.join(process.resourcesPath, "backend");
}

function getFrontendDir() {
  if (isDev) return path.join(__dirname, "../../frontend");
  return path.join(process.resourcesPath, "frontend");
}

// ─── Backend ──────────────────────────────────────────────────────────────────

function startBackend() {
  return new Promise((resolve) => {
    const backendDir = getBackendDir();

    if (!isDev) {
      // Production: run the packaged .exe
      const exePath = getBackendExePath();
      log.info("[Backend] Launching exe:", exePath);

      if (!fs.existsSync(exePath)) {
        log.error("[Backend] .exe not found at:", exePath);
        resolve(); // Continue anyway
        return;
      }

      backendProc = spawn(exePath, ["--host", "0.0.0.0", "--port", String(BACKEND_PORT)], {
        cwd: backendDir,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      // Dev: run via python uvicorn
      log.info("[Backend] Starting uvicorn from:", backendDir);
      const venvPython = path.join(backendDir, "venv", "Scripts", "python.exe");
      const pythonExe = fs.existsSync(venvPython) ? venvPython : "python";

      backendProc = spawn(
        pythonExe,
        ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", String(BACKEND_PORT), "--reload"],
        {
          cwd: backendDir,
          env: {
            ...process.env,
            PYTHONPATH: [backendDir, path.join(backendDir, ".."), path.join(backendDir, "../ai-agents"),
              path.join(backendDir, "../automation"), path.join(backendDir, "../database"),
              path.join(backendDir, "../voice")].join(";"),
          },
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
    }

    backendProc.stdout.on("data", (d) => {
      const msg = d.toString();
      log.info("[Backend]", msg.trim());
      if (msg.includes("startup complete") || msg.includes("Uvicorn running")) resolve();
    });

    backendProc.stderr.on("data", (d) => {
      const msg = d.toString();
      log.warn("[Backend ERR]", msg.trim());
      if (msg.includes("startup complete") || msg.includes("Uvicorn running")) resolve();
    });

    backendProc.on("error", (e) => { log.error("[Backend] spawn error:", e); resolve(); });

    // Fallback timeout
    setTimeout(resolve, 10000);
  });
}

// ─── Frontend ─────────────────────────────────────────────────────────────────

function startFrontend() {
  return new Promise((resolve) => {
    if (!isDev) {
      // Production: serve Next.js standalone build
      const frontendDir = getFrontendDir();
      const serverPath = path.join(frontendDir, "server.js");

      if (!fs.existsSync(serverPath)) {
        log.warn("[Frontend] server.js not found, will load from URL directly");
        resolve();
        return;
      }

      frontendProc = spawn("node", [serverPath], {
        cwd: frontendDir,
        env: { ...process.env, PORT: String(FRONTEND_PORT), NODE_ENV: "production" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      frontendProc.stdout.on("data", (d) => {
        const msg = d.toString();
        log.info("[Frontend]", msg.trim());
        if (msg.includes("Ready") || msg.includes(String(FRONTEND_PORT))) resolve();
      });

      frontendProc.on("error", (e) => { log.error("[Frontend] error:", e); resolve(); });
      setTimeout(resolve, 10000);
    } else {
      // Dev: Next.js dev server (already running via npm run dev, or start it)
      const frontendDir = getFrontendDir();
      frontendProc = spawn("npm", ["run", "dev"], {
        cwd: frontendDir,
        shell: true,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      frontendProc.stdout.on("data", (d) => {
        const msg = d.toString();
        log.info("[Frontend]", msg.trim());
        if (msg.includes("Ready") || msg.includes("ready")) resolve();
      });

      frontendProc.on("error", (e) => { log.error("[Frontend] error:", e); resolve(); });
      setTimeout(resolve, 20000);
    }
  });
}

// ─── Health Check ─────────────────────────────────────────────────────────────

function waitForBackend(retries = 40, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(`${BACKEND_URL}/health`, (res) => {
        if (res.statusCode === 200) { log.info("[Backend] Ready!"); resolve(); }
        else retry();
      }).on("error", retry);
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) reject(new Error("Backend health check timed out"));
      else setTimeout(check, delay);
    };
    check();
  });
}

// ─── Splash Screen ────────────────────────────────────────────────────────────

function createSplash() {
  const splash = new BrowserWindow({
    width: 420, height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: "#0f172a",
    resizable: false,
  });

  splash.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <body style="margin:0;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif;color:white;">
      <div style="font-size:56px;margin-bottom:20px">🤖</div>
      <h1 style="margin:0;font-size:22px;font-weight:700">AI Desktop Assistant</h1>
      <p style="color:#64748b;margin:10px 0 24px">Starting services, please wait...</p>
      <div style="width:200px;height:4px;background:#1e293b;border-radius:2px;overflow:hidden">
        <div id="bar" style="height:100%;background:#3b82f6;width:0%;border-radius:2px;transition:width 0.3s"></div>
      </div>
      <script>
        let w = 0;
        const i = setInterval(() => { w = Math.min(w + 3, 90); document.getElementById('bar').style.width = w + '%'; }, 200);
      </script>
    </body>
    </html>`);

  return splash;
}

// ─── Main Window ──────────────────────────────────────────────────────────────

function createMainWindow() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: "AI Desktop Assistant",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    backgroundColor: "#f8fafc",
  });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow.hide(); // Minimize to tray
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

// ─── System Tray ──────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, "../assets/tray-icon.png");
  const fallbackIcon = nativeImage.createEmpty();
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : fallbackIcon;

  tray = new Tray(icon);

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "AI Desktop Assistant v1.0", enabled: false },
    { type: "separator" },
    { label: "Open Dashboard", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Open API Docs", click: () => shell.openExternal(`${BACKEND_URL}/docs`) },
    { type: "separator" },
    { label: "Restart Backend", click: () => restartBackend() },
    { type: "separator" },
    { label: "Quit", click: () => { cleanup(); app.exit(0); } },
  ]));

  tray.setToolTip("AI Desktop Assistant — Running");
  tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Windows Startup ──────────────────────────────────────────────────────────

function registerStartup() {
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
    });
    log.info("[Startup] Registered for Windows startup");
  }
}

// ─── Restart Backend ──────────────────────────────────────────────────────────

async function restartBackend() {
  if (backendProc) backendProc.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 1000));
  await startBackend();
  log.info("[Backend] Restarted");
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanup() {
  try { backendProc?.kill("SIGTERM"); } catch {}
  try { frontendProc?.kill("SIGTERM"); } catch {}
  log.info("[App] Cleanup done");
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  log.info("[App] Starting...");
  const splash = createSplash();

  try {
    await startBackend();
    await startFrontend();
    await waitForBackend();

    splash.destroy();
    createTray();
    createMainWindow();
    registerStartup();
    log.info("[App] All systems go!");
  } catch (err) {
    log.error("[App] Startup error:", err);
    splash.destroy();
    dialog.showErrorBox(
      "Startup Error",
      `AI Desktop Assistant failed to start.\n\nError: ${err.message}\n\nCheck logs at: ${log.transports.file.getFile().path}`
    );
    cleanup();
    app.exit(1);
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on("before-quit", cleanup);

// ─── IPC ─────────────────────────────────────────────────────────────────────

ipcMain.handle("get-version", () => app.getVersion());
ipcMain.handle("open-external", (_, url) => shell.openExternal(url));
ipcMain.handle("minimize-to-tray", () => mainWindow?.hide());
ipcMain.handle("get-log-path", () => log.transports.file.getFile().path);
