import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import Buyer from "../db/entities/buyer.entity";
import { createBuyerSchema, updateBuyerSchema } from "../schema/buyer.schema";
import yup from "yup";
import Simulation from "../db/entities/simulation.entity";

export async function getAllBuyer(): Promise<Array<Buyer> | Error> {
  try {
    const buyers = await Buyer.find({ relations: ["simulation"] });
    if (!buyers) {
      throw createHttpError(404, "Can't get buyer");
    }

    return buyers;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function getOneBuyer(buyerId: string): Promise<Buyer | Error> {
  try {
    const buyer = await Buyer.findOne(buyerId, {
      relations: ["simulation"],
    });
    if (!buyer) {
      throw createHttpError(404, "Buyer with id " + buyerId + " is not found");
    }

    return buyer;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type createBuyerBody = yup.InferType<typeof createBuyerSchema>["body"];
export async function createBuyer(
  createBuyerBody: createBuyerBody
): Promise<Buyer | Error> {
  try {
    const simulation = await Simulation.findOne(createBuyerBody.simulationId);
    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + createBuyerBody.simulationId + " is not found"
      );
    }

    const buyer = Buyer.create({
      simulation: simulation,
      loginToken: simulation.token,
      unitValue: createBuyerBody.unitValue,
    });

    const savedBuyer = await buyer.save();
    return savedBuyer;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type updateBuyerBody = yup.InferType<typeof updateBuyerSchema>["body"];
export async function updateBuyer(
  buyerId: string,
  data: updateBuyerBody
): Promise<Buyer | Error> {
  try {
    const buyer = await Buyer.findOne(buyerId, {
      relations: ["simulation"],
    });
    if (!buyer) {
      throw createHttpError(404, "Buyer with id " + buyerId + " is not found");
    }

    const updatedBuyerData = Object.assign(buyer, data);

    const updatedBuyer = await Buyer.create({
      ...updatedBuyerData,
    }).save();

    return updatedBuyer;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function deleteBuyer(buyerId: string): Promise<Buyer | Error> {
  try {
    const buyer = await Buyer.findOne(buyerId, {
      relations: ["simulation"],
    });
    if (!buyer) {
      throw createHttpError(404, "Buyer with id " + buyerId + " is not found");
    }
    const deletedBuyer = await buyer.remove();

    return deletedBuyer;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
