import { checkIfError } from "../common/utils/error";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import { validateSocketInput } from "../middleware/validateSocketInput";
import yup from "yup";
import { Server, Socket } from "socket.io";
import {
  postSellerSchema as PostSellerRequest,
  postSellerSchema,
} from "../schema/doubleAuction.schema";
import { inputSellerMinimumPrice } from "../service/doubleAuction.service";

export function postBuyerHandler(io: Server, socket: Socket) {
  return async (request: any) => {
    try {
      socketHandleSuccessResponse(socket, 200, "Successfully buy transaction");
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type PostSellerRequest = yup.InferType<typeof postSellerSchema>;
export function postSellerHandler(io: Server, socket: Socket) {
  return async (request: PostSellerRequest) => {
    try {
      const err = validateSocketInput(request, postSellerSchema);
      checkIfError(err);

      const doubleAuctions = await inputSellerMinimumPrice(
        request.price,
        socket.id,
        request.phaseId
      );
      checkIfError(doubleAuctions);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("doubleAuctionList", doubleAuctions);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully post starting price",
        doubleAuctions
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
