import { useCallback, useState } from "react";
import { UpdateCredentialsF } from "../components/AuthProvider";
import {
  IAuthCredentials,
  IBackupSettings,
  ILastLogin,
  UpdateBackupSettingsF,
  UpdateLastLoginF,
} from "../../common/types";

type SetDirCallback = (dir: string) => void;

export function useStorage(): {
  directory: string;
  updateDirectory: SetDirCallback;
  credentials: IAuthCredentials;
  updateCredentials: UpdateCredentialsF;
  backupSettings: IBackupSettings;
  updateBackupSettings: UpdateBackupSettingsF;
  lastLogin: ILastLogin;
  updateLastLogin: UpdateLastLoginF;
} {
  const [credentials, setCredentials] = useState<IAuthCredentials>(
    JSON.parse(localStorage.getItem("credentials"))
  );
  const [directory, setDirectory] = useState<string>(
    JSON.parse(localStorage.getItem("directory"))
  );
  const [backupSettings, setBackupSettings] = useState<IBackupSettings>(
    localStorage.getItem("backupSettings")
      ? JSON.parse(localStorage.getItem("backupSettings"))
      : {
          types: 0,
          supportedTypes: 0,
          override: false,
        }
  );

  const [lastLogin, setLastLogin] = useState<ILastLogin>(
    localStorage.getItem("lastLogin")
      ? JSON.parse(localStorage.getItem("lastLogin"))
      : {
          host: "hubs.mozilla.com",
          port: "",
          email: "",
        }
  );

  const updateCredentials = useCallback(
    (newState: IAuthCredentials) => {
      setCredentials(newState);
      localStorage.setItem("credentials", JSON.stringify(newState));
    },
    [setCredentials]
  );

  const updateDirectory = useCallback(
    (newState: string) => {
      setDirectory(newState);
      localStorage.setItem("directory", JSON.stringify(newState));
    },
    [setDirectory]
  );

  const updateBackupSettings = useCallback(
    (newState: IBackupSettings) => {
      setBackupSettings(newState);
      localStorage.setItem("backupSettings", JSON.stringify(newState));
    },
    [setBackupSettings]
  );

  const updateLastLogin = useCallback(
    (newState: ILastLogin) => {
      setLastLogin(newState);
      localStorage.setItem("lastLogin", JSON.stringify(newState));
    },
    [setLastLogin]
  );

  return {
    directory,
    updateDirectory,
    credentials,
    updateCredentials,
    backupSettings,
    updateBackupSettings,
    lastLogin,
    updateLastLogin,
  };
}
