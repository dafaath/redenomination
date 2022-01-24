import { Server, Socket } from "socket.io";
import { toggleReadyHandler } from "../controller/socket.controller";

export function registerGeneralSocket(io: Server, socket: Socket) {
  socket.on("toggleReady", toggleReadyHandler(io, socket));
}
