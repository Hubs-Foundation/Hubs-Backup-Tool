import { Socket, SocketConnectOption } from "phoenix";
import jwtDecode from "jwt-decode";
import { InsecureWebsocket } from "./InsecureWebsocket";

export interface TTokenDto {
  iss?: string;
  sub?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}

export interface ReticulumMetaT {
  version: string;
  pool: string | null;
  phx_port: string;
  phx_host: string;
}

export interface ReticulumConnectOptions {
  debug: boolean;
  host: string;
  port: string;
  socketClass?: typeof Socket;
  params?: object | (() => object);
}

export function credentialsAccountId(token: string): string {
  return (jwtDecode(token) as TTokenDto).sub;
}

export function fetchReticulumAuthenticatedWithToken(
  url: string,
  token: string,
  method = "GET",
  payload?: JSON
): Promise<JSON> {
  const params = {
    headers: {
      "content-type": "application/json",
      authorization: `bearer ${token}`,
    },
    method,
    agent: {
      rejectUnauthorized: false,
    },
  } as RequestInit;
  if (payload) {
    params.body = JSON.stringify(payload);
  }
  return fetch(url, params).then(async (r) => {
    const result = await r.text();
    try {
      return JSON.parse(result);
    } catch (e) {
      // Some reticulum responses, particularly DELETE requests, don't return json.
      return result;
    }
  });
}

export async function getReticulumMeta(
  host: string,
  port: string
): Promise<ReticulumMetaT | undefined> {
  const url = `https://${host}${port ? ":" + port : ""}/api/v1/meta`;
  const params = {
    agent: {
      rejectUnauthorized: false,
    },
  } as RequestInit;
  const res = await fetch(url, params);
  const meta = (await res.json()) as ReticulumMetaT;

  if (!meta.phx_host) {
    throw new Error();
  }

  return meta;
}

export async function connectToReticulum({
  debug = false,
  params,
  socketClass = Socket,
  host,
  port,
}: ReticulumConnectOptions): Promise<Socket> {
  const socketUrl = `wss://${host}${port ? `:${port}` : ""}`;
  console.log(`Phoenix Socket URL: ${socketUrl}`);

  const socketSettings: Partial<SocketConnectOption> = {};

  if (debug) {
    socketSettings.logger = (kind, msg, data) => {
      console.log(`${kind}: ${msg}`, data);
    };
  }

  if (params) {
    socketSettings.params = params;
  }

  socketSettings.transport = InsecureWebsocket;

  const socket = new socketClass(`${socketUrl}/socket`, socketSettings);

  await new Promise<void>((resolve, reject) => {
    socket.connect();
    socket.onError(async (e: string | number | Event) => {
      console.error("Error connecting to reticulum", e);
      reject();
    });
    socket.onOpen(() => {
      console.error("Connected to reticulum");
      resolve();
    });
  });

  return socket;
}
