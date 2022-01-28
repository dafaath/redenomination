import { Server, Socket } from "socket.io";
import {
  finishPhaseHandler,
  startPhaseHandler,
  toggleReadyHandler,
} from "../controller/socket.controller";

export function registerGeneralSocket(io: Server, socket: Socket) {
  socket.on("toggleReady", toggleReadyHandler(io, socket));
  socket.on("startPhase", startPhaseHandler(io, socket));
  socket.on("finishPhase", finishPhaseHandler(io, socket));
}
