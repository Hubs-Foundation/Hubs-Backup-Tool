import http from "http";
import { IClientConfig, w3cwebsocket as W3CWebSocket } from "websocket";

export class InsecureWebsocket extends W3CWebSocket {
  constructor(
    url: string,
    protocols?: string | string[],
    origin?: string,
    headers?: http.OutgoingHttpHeaders,
    requestOptions?: object,
    IClientConfig?: IClientConfig
  ) {
    requestOptions = Object.assign({}, requestOptions, {
      rejectUnauthorized: false,
    });
    super(url, protocols, origin, headers, requestOptions, IClientConfig);
  }
}
