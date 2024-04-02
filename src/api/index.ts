import AuthChannel from "./auth-channel";
import {
  getReticulumMeta,
  connectToReticulum,
  credentialsAccountId,
} from "./phoenix-utils";
import {
  startBackup,
  cancelBackup,
  getLogPath,
  getSupportedEndpoints,
} from "./backup";
import {
  IAuthReticulum,
  IAuthReticulumParams,
  IOpenLogFilePathParams,
} from "../common/types";

// api exports functions that make up the frontend api, ie that in
// turn either do IPC calls to main for db communication or use
// allowed nodejs features like file i/o.
// Example `my-feature.ts`:
// export const fetchX = async (): Promise<X> => { ... }

async function authReticulum(
  event: Electron.IpcMainInvokeEvent,
  params: IAuthReticulumParams
): Promise<IAuthReticulum> {
  const meta = await getReticulumMeta(params.host, params.port);
  const socket = await connectToReticulum({
    debug: true,
    host: meta.phx_host,
    port: params.port,
  });

  const authChannel = new AuthChannel(socket);
  const { getToken } = await authChannel.startAuthentication(params.email);
  const token = (await getToken) as string;

  socket.disconnect();

  return { token, accountId: credentialsAccountId(token) };
}

async function getLogFilePath(
  event: Electron.IpcMainInvokeEvent,
  params: IOpenLogFilePathParams
): Promise<string> {
  return getLogPath(params.directory, params.credentials);
}

export default {
  getLogFilePath,
  authReticulum,
  startBackup,
  cancelBackup,
  getSupportedEndpoints,
};
