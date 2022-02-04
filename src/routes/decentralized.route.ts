import { Server, Socket } from "socket.io";
import {
  buyHandler,
  inputSellerPriceHandler,
} from "../controller/decentralized.controller";

export function registerDecentralized(io: Server, socket: Socket) {
  socket.on("ds:inputSellerPrice", inputSellerPriceHandler(io, socket));

  socket.on("ds:buy", buyHandler(io, socket));
}
