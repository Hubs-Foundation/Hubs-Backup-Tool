export type IAuthReticulum = {
  token: string;
  accountId: string;
} | null;

export type IAuthCredentials = {
  email: string;
  host: string;
  port: string;
  token: string;
  accountId: string;
} | null;

export enum IBackupTypes {
  Avatars = 1 << 0,
  Scenes = 1 << 1,
  Blender = 1 << 2,
  Rooms = 1 << 3,
  Media = 1 << 4,
}

export type ILastLogin = {
  host: string;
  port: string;
  email: string;
} | null;

export type UpdateLastLoginF = (newState: ILastLogin) => void;

export type IBackupSettings = {
  types: number;
  supportedTypes: number;
  override: boolean;
} | null;

export type UpdateBackupSettingsF = (newState: IBackupSettings) => void;

export type ISupportedEndpointsParams = {
  credentials: IAuthCredentials;
};

export type IBackupParams = {
  directory: string;
  types: IBackupTypes;
  credentials: IAuthCredentials;
  override: boolean;
};

export type IBackupProgressUpdateT = {
  type: IBackupTypes;
  pct: number;
};
export type BackupProgressUpdateCallback = (
  props: IBackupProgressUpdateT
) => void;

export type IAuthReticulumParams = {
  host: string;
  port: string;
  email: string;
};

export type IOpenLogFilePathParams = {
  directory: string;
  credentials: IAuthCredentials;
};
