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
  setBidOffer,
  inputBuyerPrice,
  inputSellerPrice,
  allSold,
  initialStageFinishCheck,
  updateDAStage,
  calculateBidOffer,
} from "../service/doubleAuction.service";
import {
  checkIsAllClientDone,
  updatePhaseStage,
  validateClientDone,
} from "../service/socket.service";
import { clientDoneSchema } from "../schema/socket.schema";

type PostBuyerRequest = yup.InferType<typeof postBuyerSchema>;
type PostSellerRequest = yup.InferType<typeof postSellerSchema>;
type utilsRequest = yup.InferType<typeof requestListDASchema>;
type clientDoneRequest = yup.InferType<typeof clientDoneSchema>;

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
      if (stageCode instanceof Error) {
        checkIfError(stageCode);
      } else if (stageCode === false) {
        const doubleAuctionMaxMinPrice = await initialStageFinishCheck(
          request.phaseId
        );
        if (doubleAuctionMaxMinPrice instanceof Error) {
          checkIfError(doubleAuctionMaxMinPrice);
        } else if (doubleAuctionMaxMinPrice !== undefined) {
          io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);
          const sessionData = await updatePhaseStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }

        socketHandleSuccessResponse(
          socket,
          200,
          "Successfully input buyer price",
          {}
        );
      } else {
        const matchData = await checkIfBuyerBidMatch(
          socket.id,
          request.buyerBargain,
          request.phaseId
        );
        if (matchData instanceof Error) {
          throw matchData;
        } else if (matchData.match === true) {
          const sessionData = await updateDAStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }

        const doubleAuctionMaxMinPrice = await setBidOffer(request.phaseId);
        checkIfError(doubleAuctionMaxMinPrice);
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
            { matchData, ...doubleAuctionMaxMinPrice }
          );
        }
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
      if (stageCode instanceof Error) {
        checkIfError(stageCode);
      } else if (stageCode === true) {
        const matchData = await checkIfSellerBidMatch(
          socket.id,
          request.sellerBargain,
          request.phaseId
        );
        if (matchData instanceof Error) {
          throw matchData;
        } else if (matchData.match === true) {
          const sessionData = await updateDAStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }

        const doubleAuctionMaxMinPrice = await setBidOffer(request.phaseId);
        checkIfError(doubleAuctionMaxMinPrice);
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
      } else {
        const doubleAuctionMaxMinPrice = await initialStageFinishCheck(
          request.phaseId
        );
        if (doubleAuctionMaxMinPrice instanceof Error) {
          checkIfError(doubleAuctionMaxMinPrice);
        } else if (doubleAuctionMaxMinPrice !== undefined) {
          io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);
          const sessionData = await updatePhaseStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }

        socketHandleSuccessResponse(
          socket,
          200,
          "Successfully input seller price",
          {}
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

      const doubleAuction = await setBidOffer(request.phaseId);
      checkIfError(doubleAuction);

      socket.emit("doubleAuctionList", doubleAuction);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function initStageTimeRunOutHandler(io: Server, socket: Socket) {
  return async (request: utilsRequest) => {
    try {
      const isValid = validateSocketInput(request, requestListDASchema);
      checkIfError(isValid);
      const joinedRoom = Array.from(socket.rooms);

      const doubleAuctionMaxMinPrice = await calculateBidOffer(request.phaseId);
      if (doubleAuctionMaxMinPrice instanceof Error) {
        checkIfError(doubleAuctionMaxMinPrice);
      } else if (doubleAuctionMaxMinPrice !== undefined) {
        io.to(joinedRoom).emit("doubleAuctionList", doubleAuctionMaxMinPrice);
        const sessionData = await updatePhaseStage(request.phaseId);
        checkIfError(sessionData);
        io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
      }

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully calculated available bid offer",
        {}
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

export function clientDoneDAHandler(io: Server, socket: Socket) {
  return async (request: clientDoneRequest) => {
    try {
      const isValid = validateSocketInput(request, clientDoneSchema);
      checkIfError(isValid);

      const isClientDone = await validateClientDone(
        request.phaseId,
        request.clientId
      );
      checkIfError(isClientDone);
      const isAllDone = await checkIsAllClientDone(request.phaseId);
      if (isAllDone instanceof Error) {
        checkIfError(isAllDone);
      } else if (isAllDone === true) {
        const sessionData = await updatePhaseStage(request.phaseId);
        checkIfError(sessionData);
        const joinedRoom = Array.from(socket.rooms);
        io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        // create session data
        // 5 second
        // finishphase
        // startphase
      }
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
