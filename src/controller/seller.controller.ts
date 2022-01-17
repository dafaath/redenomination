import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import yup from "yup";
import {
  createSellerSchema,
  updateSellerSchema,
} from "../schema/seller.schema";
import {
  createSeller,
  deleteSeller,
  getAllSeller,
  getOneSeller,
  updateSeller,
} from "../service/seller.service";
import { checkIfError } from "../common/utils/error";

export async function getAllSellerHandler(_: Request, res: Response) {
  try {
    const sellers = await getAllSeller();
    checkIfError(sellers);

    handleSuccessResponse(res, 200, "Successfully get all seller", sellers);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getOneSellerHandler(req: Request, res: Response) {
  try {
    const sellerId = req.params.id;
    const seller = await getOneSeller(sellerId);
    checkIfError(seller);

    handleSuccessResponse(res, 200, "Successfully get seller", seller);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type createSellerRequest = yup.InferType<typeof createSellerSchema>;
export async function createSellerHandler(req: Request, res: Response) {
  try {
    const request = req as createSellerRequest;
    const body = request.body;

    const seller = await createSeller(body);
    checkIfError(seller);

    handleSuccessResponse(res, 201, "Successfully created new seller", seller);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type updateSellerRequest = yup.InferType<typeof updateSellerSchema>;
export async function updateSellerHandler(req: Request, res: Response) {
  try {
    const sellerId = req.params.id;
    const request = req as updateSellerRequest;
    const body = request.body;

    const seller = await updateSeller(sellerId, body);
    checkIfError(seller);

    handleSuccessResponse(res, 200, "Successfully updated a seller", seller);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function deleteSellerHandler(req: Request, res: Response) {
  try {
    const sellerId = req.params.id;

    const seller = await deleteSeller(sellerId);
    checkIfError(seller);

    handleSuccessResponse(res, 200, "Successfully deleted a seller", seller);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
