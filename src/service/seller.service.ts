import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import Seller from "../db/entities/seller.entity";
import { createSellerSchema } from "../schema/seller.schema";
import yup from "yup";
import Simulation from "../db/entities/simulation.entity";

export async function getAllSeller(): Promise<Array<Seller> | Error> {
  try {
    const sellers = await Seller.createQueryBuilder().getMany();
    if (!sellers) {
      throw createHttpError(404, "Can't get seller");
    }

    return sellers;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function getOneSeller(sellerId: string): Promise<Seller | Error> {
  try {
    const seller = await Seller.findOne(sellerId);
    if (!seller) {
      throw createHttpError(
        404,
        "Seller with id " + sellerId + " is not found"
      );
    }

    return seller;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type createSellerBody = yup.InferType<typeof createSellerSchema>["body"];
export async function createSeller(
  createSellerBody: createSellerBody
): Promise<Seller | Error> {
  try {
    const simulation = await Simulation.findOne(createSellerBody.simulationId);
    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + createSellerBody.simulationId + " is not found"
      );
    }

    const seller = Seller.create({
      simulation: simulation,
      loginToken: createSellerBody.loginToken,
      unitCost: createSellerBody.unitCost,
    });

    const savedSeller = await seller.save();
    return savedSeller;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function deleteSeller(sellerId: string): Promise<Seller | Error> {
  try {
    const seller = await Seller.findOne(sellerId);
    if (!seller) {
      throw createHttpError(
        404,
        "Seller with id " + sellerId + " is not found"
      );
    }
    const deletedSeller = await seller.remove();

    return deletedSeller;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
