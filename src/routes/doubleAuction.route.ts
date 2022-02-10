import { Server, Socket } from "socket.io";
import {
  postBuyerHandler,
  postSellerHandler,
} from "../controller/doubleAuction.controller";

export function registerDoubleAuction(io: Server, socket: Socket) {
  socket.on("da:postBuyer", postBuyerHandler(io, socket));
  socket.on("da:postSeller", postSellerHandler(io, socket));
}
