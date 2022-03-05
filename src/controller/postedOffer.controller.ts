import { Server, Socket } from "socket.io";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "../common/utils/responseHandler";
import {
  buySchema,
  inputSellerPriceSchema,
  requestListPOSchema,
} from "../schema/postedOffer.schema";
import yup from "yup";
import { validateSocketInput } from "../middleware/validateSocketInput";
import { checkIfError } from "../common/utils/error";
import {
  buyPostedOffer,
  inputSellerPrice,
  checkIfIsDone,
  requestList,
} from "../service/postedOffer.service";
import { updatePhaseStage } from "../service/socket.service";

type socketTokenLoginRequest = yup.InferType<typeof inputSellerPriceSchema>;
export function inputSellerPriceHandler(io: Server, socket: Socket) {
  return async (request: socketTokenLoginRequest) => {
    try {
      const isValid = validateSocketInput(request, inputSellerPriceSchema);
      checkIfError(isValid);

      const postedOffers = await inputSellerPrice(
        socket.id,
        request.price,
        request.phaseId
      );
      checkIfError(postedOffers);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("postedOfferList", postedOffers);

      if (!(postedOffers instanceof Error)) {
        const isDone = await checkIfIsDone(request.phaseId, postedOffers.length);
        checkIfError(isDone);
        io.to(joinedRoom).emit("po:isDone", isDone);
        if (isDone && !(isDone instanceof Error)) {
          const sessionData = await updatePhaseStage(request.phaseId);
          checkIfError(sessionData);
          io.to(joinedRoom).emit("sessionDataUpdate", sessionData);
        }
      }

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully input seller price",
        postedOffers
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type buyPostedOfferRequest = yup.InferType<typeof buySchema>;
export function buyHandler(io: Server, socket: Socket) {
  return async (request: buyPostedOfferRequest) => {
    try {
      const isValid = validateSocketInput(request, buySchema);
      checkIfError(isValid);

      const postedOffers = await buyPostedOffer(
        request.postedOfferId,
        socket.id,
        request.phaseId
      );
      checkIfError(postedOffers);

      const joinedRoom = Array.from(socket.rooms);
      io.to(joinedRoom).emit("postedOfferList", postedOffers);

      socketHandleSuccessResponse(
        socket,
        200,
        "Successfully buy transaction",
        postedOffers
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}

type requestListRequest = yup.InferType<typeof requestListPOSchema>;
export function requestListHandler(io: Server, socket: Socket) {
  return async (request: requestListRequest) => {
    try {
      const isValid = validateSocketInput(request, requestListPOSchema);
      checkIfError(isValid);

      const postedOffers = await requestList(request.phaseId);
      socket.emit("postedOfferList", postedOffers);
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  };
}
