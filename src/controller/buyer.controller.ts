import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import yup from "yup";
import { createBuyerSchema, updateBuyerSchema } from "../schema/buyer.schema";
import {
  createBuyer,
  deleteBuyer,
  getAllBuyer,
  getOneBuyer,
  updateBuyer,
} from "../service/buyer.service";
import { checkIfError } from "../common/utils/error";

export async function getAllBuyerHandler(_: Request, res: Response) {
  try {
    const buyers = await getAllBuyer();
    checkIfError(buyers);

    handleSuccessResponse(res, 200, "Successfully get all buyer", buyers);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getOneBuyerHandler(req: Request, res: Response) {
  try {
    const buyerId = req.params.id;
    const buyer = await getOneBuyer(buyerId);
    checkIfError(buyer);

    handleSuccessResponse(res, 200, "Successfully get buyer", buyer);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type createBuyerRequest = yup.InferType<typeof createBuyerSchema>;
export async function createBuyerHandler(req: Request, res: Response) {
  try {
    const request = req as createBuyerRequest;
    const body = request.body;

    const buyer = await createBuyer(body);
    checkIfError(buyer);

    handleSuccessResponse(res, 201, "Successfully created new buyer", buyer);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type updateBuyerRequest = yup.InferType<typeof updateBuyerSchema>;
export async function updateBuyerHandler(req: Request, res: Response) {
  try {
    const buyerId = req.params.id;
    const request = req as updateBuyerRequest;
    const body = request.body;

    const buyer = await updateBuyer(buyerId, body);
    checkIfError(buyer);

    handleSuccessResponse(res, 200, "Successfully updated a buyer", buyer);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function deleteBuyerHandler(req: Request, res: Response) {
  try {
    const buyerId = req.params.id;

    const buyer = await deleteBuyer(buyerId);
    checkIfError(buyer);

    handleSuccessResponse(res, 200, "Successfully deleted a buyer", buyer);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
