import {
  IBackupParams,
  IAuthReticulumParams,
  ISupportedEndpointsParams,
  IOpenLogFilePathParams,
  IAuthReticulum,
  BackupProgressUpdateCallback,
} from "../common/types";

export interface IElectronAPI {
  selectDirectory: () => Promise<string>;
  openDirectory: (dir: string) => void;
  openInBrowser: (url: string) => void;
}

export interface IHubsAPI {
  getLogFilePath: (params: IOpenLogFilePathParams) => Promise<string>;
  authReticulum: (params: IAuthReticulumParams) => Promise<IAuthReticulum>;
  startBackup: (params: IBackupParams) => Promise<boolean>;
  cancelBackup: () => Promise<void>;
  onBackupProgressUpdate: (callback: BackupProgressUpdateCallback) => void;
  offBackupProgress: (callback: BackupProgressUpdateCallback) => void;
  getSupportedEndpoints: (params: ISupportedEndpointsParams) => Promise<number>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    hubs: IHubsAPI;
  }
}
