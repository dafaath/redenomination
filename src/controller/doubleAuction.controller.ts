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
  postSellerSchema,
  requestListDASchema,
} from "../schema/doubleAuction.schema";
import {
  checkIfBuyerBidMatch,
  checkIfSellerBidMatch,
  getBidOffer,
  inputBuyerPrice,
  inputSellerPrice,
  allSold,
} from "../service/doubleAuction.service";

type PostBuyerRequest = yup.InferType<typeof postBuyerSchema>;
type PostSellerRequest = yup.InferType<typeof postSellerSchema>;
type utilsRequest = yup.InferType<typeof requestListDASchema>;

export function postBuyerHandler(io: Server, socket: Socket) {
  return async (request: PostBuyerRequest) => {
    try {
      const err = validateSocketInput(request, postBuyerSchema);
      checkIfError(err);
      const joinedRoom = Array.from(socket.rooms);

      const stageCode = await inputBuyerPrice(
        request.buyerBargain,
        socket.id,
        request.phaseId
      );
      checkIfError(stageCode);

      const matchData = await checkIfBuyerBidMatch(
        socket.id,
        request.buyerBargain,
        request.phaseId
      );

      const doubleAuctionMaxMinPrice = await getBidOffer();
      checkIfError(doubleAuctionMaxMinPrice);
      io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);

      if (matchData instanceof Error) {
        checkIfError(matchData);
      } else if (matchData.match) {
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
          { matchData, ...doubleAuctionMaxMinPrice }
        );
      }

      const isDone = await allSold(request.phaseId);
      checkIfError(isDone);
      if (isDone === true) {
        io.to(joinedRoom).emit("da:isDone", {
          isDone: isDone,
          phaseId: request.phaseId,
        });
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function postSellerHandler(io: Server, socket: Socket) {
  return async (request: PostSellerRequest) => {
    try {
      const err = validateSocketInput(request, postSellerSchema);
      checkIfError(err);
      const joinedRoom = Array.from(socket.rooms);

      const stageCode = await inputSellerPrice(
        request.sellerBargain,
        socket.id,
        request.phaseId
      );
      checkIfError(stageCode);

      const matchData = await checkIfSellerBidMatch(
        socket.id,
        request.sellerBargain,
        request.phaseId
      );

      const doubleAuctionMaxMinPrice = await getBidOffer();
      checkIfError(doubleAuctionMaxMinPrice);
      io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);

      if (matchData instanceof Error) {
        checkIfError(matchData);
      } else if (matchData.match) {
        if (matchData.buyer?.socketId) {
          io.to(matchData.buyer.socketId).emit("bidMatch", matchData);
        }
        if (matchData.seller?.socketId) {
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

      const isDone = await allSold(request.phaseId);
      checkIfError(isDone);
      if (isDone === true) {
        io.to(joinedRoom).emit("da:isDone", {
          isDone: isDone,
          phaseId: request.phaseId,
        });
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function requestListHandler(io: Server, socket: Socket) {
  return async (request: utilsRequest) => {
    try {
      const isValid = validateSocketInput(request, requestListDASchema);
      checkIfError(isValid);

      const doubleAuction = await getBidOffer();
      checkIfError(doubleAuction);

      socket.emit("doubleAuctionList", doubleAuction);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
