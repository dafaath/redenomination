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
import {
  deleteShortLivedData,
  updatePhaseStage,
} from "../service/socket.service";

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

      const doubleAuctionMaxMinPrice = await getBidOffer(request.phaseId);
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

      const isDone = await allSold(request.phaseId);
      checkIfError(isDone);
      if (isDone === true) {
        io.to(joinedRoom).emit("da:isDone", {
          isDone: isDone,
          phaseId: request.phaseId,
        });

        const error = await deleteShortLivedData(request.phaseId);
        checkIfError(error);

        const sessionData = await updatePhaseStage(request.phaseId);
        checkIfError(sessionData);
        io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
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

      const doubleAuctionMaxMinPrice = await getBidOffer(request.phaseId);
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

        const error = await deleteShortLivedData(request.phaseId);
        checkIfError(error);

        const sessionData = await updatePhaseStage(request.phaseId);
        checkIfError(sessionData);
        io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type requestListRequest = yup.InferType<typeof requestListDASchema>;
export function requestListHandler(io: Server, socket: Socket) {
  return async (request: requestListRequest) => {
    try {
      const isValid = validateSocketInput(request, requestListDASchema);
      checkIfError(isValid);

      const doubleAuction = await getBidOffer(request.phaseId);
      checkIfError(doubleAuction);

      socket.emit("doubleAuctionList", doubleAuction);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
