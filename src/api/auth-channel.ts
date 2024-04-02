import uuid from "uuid/v4";
import { Socket } from "phoenix";

export default class AuthChannel {
  socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async startAuthentication(
    email: string
  ): Promise<{ getToken: Promise<string> }> {
    const channel = this.socket.channel(`auth:${uuid()}`);
    await new Promise((resolve, reject) =>
      channel.join().receive("ok", resolve).receive("error", reject)
    );

    const getToken = new Promise<string>((resolve) =>
      channel.on("auth_credentials", ({ credentials: token }) => {
        resolve(token);
      })
    );

    channel.push("auth_request", { email, origin: "hubs" });

    // Returning an object with the authComplete promise since we want the caller to wait for the above await but not
    // for authComplete.
    return { getToken };
  }
}
