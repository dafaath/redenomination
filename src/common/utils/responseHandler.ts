import { Response } from "express";
import createError from "http-errors";
import log from "./logger";

export type ResponseTemplate = {
  status: number;
  message: string;
  data: object;
};

export async function handleSuccessResponse(
  res: Response,
  statusCode: number,
  message: string,
  data: object = {}
) {
  const response: ResponseTemplate = {
    status: statusCode,
    message: message,
    data: data,
  };
  res.status(statusCode).send(response);
}

export async function handleErrorResponse(res: Response, error: unknown) {
  log.error(error);
  if (createError.isHttpError(error)) {
    const response: ResponseTemplate = {
      status: error.status,
      message: error.message,
      data: {},
    };
    return res.status(error.statusCode).send(response);
  } else if (error instanceof Error) {
    const response: ResponseTemplate = {
      status: 500,
      message: error.message,
      data: {},
    };
    return res.status(500).send(response);
  } else if (typeof error === "string") {
    const response: ResponseTemplate = {
      status: 500,
      message: error,
      data: {},
    };
    return res.status(500).send(response);
  } else {
    const response: ResponseTemplate = {
      status: 500,
      message: "something wrong has happened to the server",
      data: {},
    };
    return res.status(500).send(response);
  }
}
