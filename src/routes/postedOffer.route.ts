import { Server, Socket } from "socket.io";
import {
  buyHandler,
  inputSellerPriceHandler,
} from "../controller/postedOffer.controller";

export function registerPostedOffer(io: Server, socket: Socket) {
  socket.on("po:inputSellerPrice", inputSellerPriceHandler(io, socket));

  socket.on("po:buy", buyHandler(io, socket));
}
