import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import yup from "yup";
import { createSessionSchema } from "../schema/session.schema";
import {
  createSession,
  deleteSession,
  finishSession,
  getAllSession,
  getOneSession,
  runSession,
  updateSession,
} from "../service/session.service";
import { checkIfError } from "../common/utils/error";

export async function getAllSessionHandler(_: Request, res: Response) {
  try {
    const sessions = await getAllSession();
    checkIfError(sessions);

    handleSuccessResponse(res, 200, "Successfully get all session", sessions);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getOneSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = req.params.id;
    const session = await getOneSession(sessionId);
    checkIfError(session);

    handleSuccessResponse(res, 200, "Successfully get session", session);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type createSessionRequest = yup.InferType<typeof createSessionSchema>;
export async function createSessionHandler(req: Request, res: Response) {
  try {
    const request = req as createSessionRequest;
    const body = request.body;

    const session = await createSession(body);
    checkIfError(session);

    handleSuccessResponse(
      res,
      201,
      "Successfully created new session",
      session
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function updateSessionHandler(req: Request, res: Response) {
  try {
    const request = req as createSessionRequest;
    const sessionId = req.params.id;
    const body = request.body;

    const session = await updateSession(sessionId, body);
    checkIfError(session);

    handleSuccessResponse(res, 200, "Successfully updated a session", session);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function deleteSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = req.params.id;

    const session = await deleteSession(sessionId);
    checkIfError(session);

    handleSuccessResponse(res, 200, "Successfully deleted a session", session);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function runSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = req.params.id;

    const session = await runSession(sessionId);
    checkIfError(session);

    handleSuccessResponse(res, 200, "Successfully run the session", session);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function finishSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = req.params.id;

    const session = await finishSession(sessionId);
    checkIfError(session);

    handleSuccessResponse(res, 200, "Successfully finish the session", session);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
