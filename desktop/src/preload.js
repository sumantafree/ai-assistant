/**
 * Electron preload script — exposes safe IPC bridge to renderer.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  minimizeToTray: () => ipcRenderer.invoke("minimize-to-tray"),
});
