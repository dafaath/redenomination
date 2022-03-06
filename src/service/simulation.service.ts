import createHttpError from "http-errors";
import { errorReturnHandler, errorThrowUtils } from "../common/utils/error";
import Simulation, { SimulationType } from "../db/entities/simulation.entity";
import { createSimulationSchema } from "../schema/simulation.schema";
import yup from "yup";
import { randomString, sortPhases } from "../common/utils/other";
import dayjs from "dayjs";
import Seller from "../db/entities/seller.entity";
import Buyer from "../db/entities/buyer.entity";
import fileUpload from "express-fileupload";
import { getManager } from "typeorm";
import { getSessionSummary, SessionSummary } from "./session.service";
import Session from "../db/entities/session.entity";
import path from "path";
import fs from "fs";
import { appRoot } from "../app";

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
      relations: ["buyers", "sellers", "sessions", "sessions.profits"],
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

type createSimulationBody = yup.InferType<typeof createSimulationSchema>["body"];
export async function createSimulation(
  data: createSimulationBody
): Promise<Simulation | Error> {
  try {
    console.log("data", data);
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
        username: randomString(4),
      });
    });

    const buyers = data.buyer.map((b) => {
      return Buyer.create({
        loginToken: token,
        unitValue: b.unitValue,
        username: randomString(4),
      });
    });

    const timeCreated = new Date(Date.now());

    const simulation = Simulation.create({
      ...data,
      token,
      avgTrxOccurrence: 0,
      avgTrxPrice: 0,
      timeCreated: timeCreated,
      timeLastRun: timeCreated,
      sellers: sellers,
      buyers: buyers,
    });

    const savedSimulation = await simulation.save();
    console.log("savedSimulation", savedSimulation);

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
      const currentFile = path.join(appRoot, "public", simulation.goodsPic);
      if (fs.existsSync(currentFile)) {
        fs.unlinkSync(currentFile);
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

    const fileExtSplit = goodsPicture.name.split(".");
    if (
      fileExtSplit.length === 1 ||
      (fileExtSplit[0] === "" && fileExtSplit.length === 2)
    ) {
      throw createHttpError(400, "File must have an extension");
    }
    const fileExt = fileExtSplit.pop();
    const savedFileName = simulation.id + "." + fileExt;

    // remove current file if exists
    if (simulation.goodsPic) {
      const currentFile = path.join(appRoot, "public", simulation.goodsPic);
      if (fs.existsSync(currentFile)) {
        fs.unlinkSync(currentFile);
      }
    }

    goodsPicture.mv(path.join(appRoot, "public", savedFileName));

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

export async function calcSimulation(
  simulationId: string
): Promise<Simulation | Error> {
  try {
    const simulation = await Simulation.findOne(simulationId, {
      relations: ["sessions"],
    });

    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + simulationId + " is not found"
      );
    }
    const timeFinished = new Date(Date.now());

    const runnedSessions = simulation.sessions.filter(
      (session) => session.isDone() === true
    );
    simulation.avgTrxOccurrence =
      runnedSessions.reduce(
        (sum, session) => sum + Number(session.avgTrxOccurrence),
        0
      ) / runnedSessions.length;
    simulation.avgTrxPrice =
      runnedSessions.reduce(
        (sum, session) => sum + Number(session.avgTrxPrice),
        0
      ) / runnedSessions.length;
    simulation.timeLastRun = timeFinished;

    const calculatedSimulation = await simulation.save();

    return calculatedSimulation;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export type SimulationSummary = {
  id: string;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  timeLastRun: Date;
  sessionSummary: SessionSummary[];
};
export async function getSimulationSummary(
  simulationId: string
): Promise<SimulationSummary | Error> {
  try {
    const simulation = await Simulation.findOne(simulationId, {
      relations: ["buyers", "sellers", "sessions", "sessions.phases"],
    });

    if (!simulation) {
      throw createHttpError(
        404,
        "Simulation with id " + simulationId + " is not found"
      );
    }

    const sessionSummaries: SessionSummary[] = [];

    for (let i = 0; i < simulation.sessions.length; i++) {
      const session = simulation.sessions[i];
      const sessionSummary = await getSessionSummary(session);
      if (sessionSummary instanceof Error) {
        throw sessionSummary;
      }

      sessionSummaries.push(sessionSummary);
    }

    const SimulationSummary: SimulationSummary = {
      id: simulation.id,
      avgTrxOccurrence: simulation.avgTrxOccurrence,
      avgTrxPrice: simulation.avgTrxPrice,
      timeLastRun: simulation.timeLastRun,
      sessionSummary: sessionSummaries,
    };

    return SimulationSummary;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function getAnovaSummaryCSV() {
  try {
    const sessions = await Session.find({
      relations: ["simulation", "phases"],
    });

    if (!sessions) {
      throw createHttpError(500, "Can't get simulation");
    }

    const header = [
      "Jenis Inflasi", "A",
      "Sistem Transaksi", "B",
      "Jenis Barang", "C",
      "Jenis Pertumbuhan Ekonomi", "D",
      "Ulangan", "P", "Q",
      "P PraRedenominasi", "Q PraRedenominasi",
      "P Transisi Redenominasi", "Q Transisi Redenominasi",
      "P PascaRedenominasi", "Q PascaRedenominasi",
    ];
    const data = sessions.map((session) => {
      let simulationCode: number;
      let inflationCode: number;
      let goodsCode: number;
      let growthCode: number;

      switch (session.simulation.simulationType) {
        case SimulationType.DOUBLE_AUCTION:
          simulationCode = 1;
          break;
        case SimulationType.DECENTRALIZED:
          simulationCode = 2;
          break;
        case SimulationType.POSTED_OFFER:
          simulationCode = 3;
          break;

        default:
          throw createHttpError(404, "Simulation Type for session " + session.id + " not Found");
      }

      switch (session.simulation.inflationType) {
        case "Inflasi Tinggi":
          inflationCode = 1;
          break;
        case "Inflasi Rendah":
          inflationCode = 2;
          break;

        default:
          throw createHttpError(404, "Inflation Type for session " + session.id + " not Found");
      }

      switch (session.simulation.goodsType) {
        case "Elastis":
          goodsCode = 1;
          break;
        case "Inelastis":
          goodsCode = 2;
          break;

        default:
          throw createHttpError(404, "Goods Type for session " + session.id + " not Found");
      }

      switch (session.simulation.growthType) {
        case "Tinggi":
          growthCode = 1;
          break;
        case "Rendah":
          growthCode = 2;
          break;

        default:
          throw createHttpError(404, "Growth Type for session " + session.id + " not Found");
      }

      const phases = sortPhases(session.phases);
      return [
        session.simulation.inflationType, inflationCode,
        session.simulation.simulationType, simulationCode,
        session.simulation.goodsType, goodsCode,
        session.simulation.growthType, growthCode,
        session.sessionType, session.avgTrxPrice, session.avgTrxOccurrence,
        phases[0].avgTrxPrice, phases[0].avgTrxOccurrence,
        phases[1].avgTrxPrice, phases[1].avgTrxOccurrence,
        phases[2].avgTrxPrice, phases[2].avgTrxOccurrence,
      ];
    });

    return [header, ...data];
  } catch (error) {
    return errorReturnHandler(error);
  }
}
