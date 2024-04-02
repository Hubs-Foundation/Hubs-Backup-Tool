// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import {
  IBackupParams,
  IAuthReticulumParams,
  BackupProgressUpdateCallback,
  IOpenLogFilePathParams,
  ISupportedEndpointsParams,
} from "../common/types";

process.once("loaded", () => {
  contextBridge.exposeInMainWorld("hubs", {
    getLogFilePath: (params: IOpenLogFilePathParams) =>
      ipcRenderer.invoke("hubs:getLogFilePath", params),
    authReticulum: (params: IAuthReticulumParams) =>
      ipcRenderer.invoke("hubs:authReticulum", params),
    startBackup: (params: IBackupParams) =>
      ipcRenderer.invoke("hubs:startBackup", params),
    cancelBackup: () => ipcRenderer.invoke("hubs:cancelBackup"),
    onBackupProgressUpdate: (callback: BackupProgressUpdateCallback) =>
      ipcRenderer.on("backup-progress-update", (_event, value) =>
        callback(value)
      ),
    offBackupProgress: (callback: BackupProgressUpdateCallback) =>
      ipcRenderer.on("backup-progress-update", (_event, value) =>
        callback(value)
      ),
    getSupportedEndpoints: (params: ISupportedEndpointsParams) =>
      ipcRenderer.invoke("hubs:getSupportedEndpoints", params),
  });
  contextBridge.exposeInMainWorld("electronAPI", {
    selectDirectory: () => ipcRenderer.invoke("electronAPI:selectDirectory"),
    openDirectory: (dir: string) =>
      ipcRenderer.invoke("electronAPI:openDirectory", dir),
    openInBrowser: (url: string) =>
      ipcRenderer.invoke("electronAPI:openInBrowser", url),
  });
});
