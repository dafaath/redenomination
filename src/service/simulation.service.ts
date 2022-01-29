import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import Simulation, { SimulationType } from "../db/entities/simulation.entity";
import { createSimulationSchema } from "../schema/simulation.schema";
import yup from "yup";
import { randomString } from "../common/utils/other";
import dayjs from "dayjs";
import Seller from "../db/entities/seller.entity";
import Buyer from "../db/entities/buyer.entity";
import fileUpload from "express-fileupload";
import { googleCloud } from "../app";
import config from "../configHandler";
import { getManager } from "typeorm";

export async function getAllSimulation(): Promise<Array<Simulation> | Error> {
  try {
    const simulations = await Simulation.find({
      relations: ["buyers", "sellers", "sessions"],
      order: {
        timeCreated: "DESC",
      },
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

    if (simulation.goodsPic) {
      const currentFile = googleCloud
        .bucket(config.googleCloudStorage.bucketName)
        .file(simulation.goodsPic);

      const [isFileExists] = await currentFile.exists();

      if (isFileExists) {
        await currentFile.delete();
      }
    }

    const deletedSimulation = await simulation.remove();

    return deletedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function saveGoodsPicture(
  simulationId: string,
  goodsPicture: fileUpload.UploadedFile
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

    const validImageTypes = ["image/jpeg", "image/png"];
    if (!validImageTypes.includes(goodsPicture.mimetype)) {
      throw createHttpError(
        403,
        `Image with type ${goodsPicture.mimetype} can't be uploaded, please use one of this: ${validImageTypes}`
      );
    }
    const fileExt = goodsPicture.name.split(".").pop();
    if (!fileExt) {
      throw createHttpError(403, "Please make sure the file have an extension");
    }

    const savedFileName = simulation.id + "." + fileExt;
    if (simulation.goodsPic !== null) {
      // remove current file if exists
      const currentFile = googleCloud
        .bucket(config.googleCloudStorage.bucketName)
        .file(simulation.goodsPic);

      const [isFileExists] = await currentFile.exists();

      if (isFileExists) {
        await currentFile.delete();
      }
    }

    // save our file
    const savedFile = googleCloud
      .bucket(config.googleCloudStorage.bucketName)
      .file(savedFileName);
    await savedFile.save(goodsPicture.data, {
      gzip: true,
      resumable: false,
    });

    // update database with saved filename
    simulation.goodsPic = savedFileName;
    const updatedSimulation = await simulation.save();

    return updatedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type ReadyCount = {
  numberOfReadyPlayer: number;
  totalPlayer: number;
};
export async function countReadyUser(
  simulationId: string
): Promise<ReadyCount | Error> {
  try {
    const chosenHost = await getManager().transaction(
      async (transactionalEntityManager) => {
        try {
          const simulation = await Simulation.findOne({ id: simulationId });

          if (!simulation) {
            throw createHttpError(
              404,
              `There is no simulation with id ${simulationId}`
            );
          }

          const buyers = await transactionalEntityManager.find(Buyer, {
            lock: {
              mode: "pessimistic_read",
            },
            where: {
              simulation: simulation,
            },
          });
          const buyersCount = buyers.length;

          const sellers = await transactionalEntityManager.find(Seller, {
            lock: {
              mode: "pessimistic_read",
            },
            where: {
              simulation: simulation,
            },
          });
          const sellersCount = sellers.length;

          const numberOfReadyBuyers = buyers.filter(
            (b) => b.isReady === true
          ).length;
          const numberOfReadySellers = sellers.filter(
            (s) => s.isReady === true
          ).length;

          const readyCount: ReadyCount = {
            numberOfReadyPlayer: numberOfReadyBuyers + numberOfReadySellers,
            totalPlayer: buyersCount + sellersCount,
          };

          return readyCount;
        } catch (error) {
          errorThrowUtils(error);
        }
      }
    );
    if (chosenHost) {
      return chosenHost;
    } else {
      return new Error("something wrong");
    }
  } catch (error) {
    return errorReturnHandler(error);
  }
}
