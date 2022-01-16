import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import Simulation, { SimulationType } from "../db/entities/simulation.entity";
import { createSimulationSchema } from "../schema/simulation.schema";
import yup from "yup";
import { randomString } from "../common/utils/other";
import dayjs from "dayjs";
import Seller from "../db/entities/seller.entity";
import Buyer from "../db/entities/buyer.entity";

export async function getAllSimulation(): Promise<Array<Simulation> | Error> {
  try {
    const simulations = await Simulation.find({
      relations: ["buyers", "sellers", "sessions"],
    });
    if (!simulations) {
      throw createHttpError(404, "Can't get simulation");
    }

    return simulations;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function getOneSimulation(
  simulationId: string
): Promise<Simulation | Error> {
  try {
    const simulation = await Simulation.findOne(simulationId, {
      relations: ["buyers", "sellers", "sessions"],
    });
    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + simulationId + " is not found"
      );
    }

    return simulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type createSimulationBody = yup.InferType<
  typeof createSimulationSchema
>["body"];
export async function createSimulation(
  data: createSimulationBody
): Promise<Simulation | Error> {
  try {
    let simulationTypeId = "";
    if (data.simulationType === SimulationType.POSTED_OFFER) {
      simulationTypeId = "PO";
    } else if (data.simulationType === SimulationType.DOUBLE_AUCTION) {
      simulationTypeId = "DA";
    } else if (data.simulationType === SimulationType.DECENTRALIZED) {
      simulationTypeId = "DS";
    }

    const currentDate = dayjs().format("DDMMYY");
    const token = randomString(4) + simulationTypeId + currentDate;
    const sellers = data.seller.map((s) => {
      return Seller.create({
        loginToken: token,
        unitCost: s.unitCost,
      });
    });

    const buyers = data.buyer.map((b) => {
      return Buyer.create({
        loginToken: token,
        unitValue: b.unitValue,
      });
    });

    const simulation = Simulation.create({
      ...data,
      token,
      avgTrxOccurrence: 0,
      avgTrxPrice: 0,
      timeCreated: new Date(Date.now()),
      timeLastRun: new Date(Date.now()),
      sellers: sellers,
      buyers: buyers,
    });

    const savedSimulation = await simulation.save();

    return savedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function updateSimulation(
  simulationId: string,
  data: createSimulationBody
): Promise<Simulation | Error> {
  try {
    const simulation = await Simulation.findOne(simulationId);
    if (!simulation) {
      throw createHttpError(
        404,
        `Simulation with id ${simulationId} is not found`
      );
    }

    const updatedSimulationData = Object.assign(simulation, data);

    const updatedSimulation = await Simulation.create({
      ...updatedSimulationData,
    }).save();

    return updatedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
export async function deleteSimulation(
  simulationId: string
): Promise<Simulation | Error> {
  try {
    const simulation = await Simulation.findOne(simulationId, {
      relations: ["buyers", "sellers", "sessions"],
    });

    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + simulationId + " is not found"
      );
    }

    const deletedSimulation = await simulation.remove();

    return deletedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
