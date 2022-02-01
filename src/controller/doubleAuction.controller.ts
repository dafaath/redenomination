import { checkIfError } from "../common/utils/error";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import { validateSocketInput } from "../middleware/validateSocketInput";
import yup from "yup";
import { Server, Socket } from "socket.io";
import {
  postBuyerSchema,
  postSellerSchema as PostSellerRequest,
  postSellerSchema,
} from "../schema/doubleAuction.schema";
import {
  checkIfBuyerBidMatch,
  checkIfSellerBidMatch,
  getMaxAndMinPrice,
  inputBuyerPrice,
  inputSellerPrice,
} from "../service/doubleAuction.service";

type PostBuyerRequest = yup.InferType<typeof postBuyerSchema>;
export function postBuyerHandler(io: Server, socket: Socket) {
  return async (request: PostBuyerRequest) => {
    try {
      const err = validateSocketInput(request, postBuyerSchema);
      checkIfError(err);

      const inputError = await inputBuyerPrice(
        request.buyerBargain,
        socket.id,
        request.phaseId
      );
      checkIfError(inputError);

      const matchData = await checkIfBuyerBidMatch(
        socket.id,
        request.buyerBargain,
        request.phaseId
      );
      if (matchData instanceof Error) {
        throw matchData;
      }

      const doubleAuctionMaxMinPrice = await getMaxAndMinPrice(request.phaseId);
      checkIfError(doubleAuctionMaxMinPrice);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);

      if (matchData.match) {
        if (matchData.buyer?.socketId) {
          io.to(matchData.buyer.socketId).emit("bidMatch", matchData);
        }
        if (matchData.seller?.socketId) {
          io.to(matchData.seller.socketId).emit("bidMatch", matchData);
        }
        socketHandleSuccessResponse(
          socket,
          201,
          `There is a match with seller bargain, successfully buy the product with price of ${request.buyerBargain}`,
          {
            matchData,
            ...doubleAuctionMaxMinPrice,
          }
        );
      } else {
        socketHandleSuccessResponse(
          socket,
          200,
          "Successfully input buyer price",
          {
            matchData,
            ...doubleAuctionMaxMinPrice,
          }
        );
      }
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

      const inputError = await inputSellerPrice(
        request.sellerBargain,
        socket.id,
        request.phaseId
      );
      checkIfError(inputError);

      const matchData = await checkIfSellerBidMatch(
        socket.id,
        request.sellerBargain,
        request.phaseId
      );
      if (matchData instanceof Error) {
        throw matchData;
      }

      const doubleAuctionMaxMinPrice = await getMaxAndMinPrice(request.phaseId);
      checkIfError(doubleAuctionMaxMinPrice);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);

      if (matchData.match) {
        if (matchData.buyer?.socketId) {
          console.log(`emit to ${matchData.buyer.socketId}`);
          io.to(matchData.buyer.socketId).emit("bidMatch", matchData);
        }
        if (matchData.seller?.socketId) {
          console.log(`emit to ${matchData.seller.socketId}`);
          io.to(matchData.seller.socketId).emit("bidMatch", matchData);
        }

        socketHandleSuccessResponse(
          socket,
          201,
          `There is a match with seller bargain, successfully buy the product with price of ${request.sellerBargain}`,
          {
            matchData: matchData,
            ...doubleAuctionMaxMinPrice,
          }
        );
      } else {
        socketHandleSuccessResponse(
          socket,
          200,
          "Successfully input seller price",
          { matchData, ...doubleAuctionMaxMinPrice }
        );
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
