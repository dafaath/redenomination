import createHttpError from "http-errors";
import { checkIfError, errorReturnHandler } from "../common/utils/error";
import Session from "../db/entities/session.entity";
import { createSessionSchema } from "../schema/session.schema";
import yup from "yup";
import Simulation from "../db/entities/simulation.entity";
import Phase, { PhaseType } from "../db/entities/phase.entity";
import Transaction from "../db/entities/transaction.entity";
import Bargain from "../db/entities/bargain.entity";
import { calcSimulation } from "./simulation.service";

export async function getAllSession(): Promise<Array<Session> | Error> {
  try {
    const sessions = await Session.find({
      relations: ["simulation", "phases"],
      order: {
        timeCreated: "DESC",
      },
    });

    if (!sessions) {
      throw createHttpError(404, "Can't get sessions");
    }

    return sessions;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function getOneSession(
  sessionId: string
): Promise<Session | Error> {
  try {
    const session = await Session.findOne(sessionId, {
      relations: ["simulation", "simulation.buyers", "simulation.sellers", "phases"],
    });

    if (!session) {
      throw createHttpError(
        404,
        "Session with id " + sessionId + " is not found"
      );
    }

    return session;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

type createSessionBody = yup.InferType<typeof createSessionSchema>["body"];
export async function createSession(
  data: createSessionBody
): Promise<Session | Error> {
  try {
    const simulation = await Simulation.findOne(data.simulationID);
    if (!simulation) {
      throw createHttpError(
        404,
        `Simulation with id ${data.simulationID} is not found`
      );
    }

    const phases: Array<Phase> = [];

    for (let i = 0; i < 3; i++) {
      let phaseType: PhaseType;
      switch (i) {
        case 0:
          phaseType = PhaseType.PRE_REDENOM_PRICE;
          break;
        case 1:
          phaseType = PhaseType.TRANSITION_PRICE;
          break;
        case 2:
          phaseType = PhaseType.POST_REDENOM_PRICE;
          break;
        default:
          throw new Error("There can be only 3 iteration");
      }

      const phase = Phase.create({
        phaseType: phaseType,
        avgTrxOccurrence: 0,
        avgTrxPrice: 0,
        timer: data.timer,
        timeCreated: new Date(Date.now()),
        timeLastRun: new Date(Date.now()),
      });
      phases.push(phase);
    }

    const session = Session.create({
      ...data,
      phases: phases,
      avgTrxOccurrence: 0,
      avgTrxPrice: 0,
      timeCreated: new Date(Date.now()),
      timeLastRun: new Date(Date.now()),
      simulation: simulation,
    });

    const savedSession = await session.save();

    return savedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function updateSession(
  sessionId: string,
  data: createSessionBody
): Promise<Session | Error> {
  try {
    const session = await Session.findOne(sessionId);
    if (!session) {
      throw createHttpError(404, `Session with id ${sessionId} is not found`);
    }

    const updatedSessionData = Object.assign(session, data);

    const updatedSession = await Session.create({
      ...updatedSessionData,
    }).save();

    return updatedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function deleteSession(
  sessionId: string
): Promise<Session | Error> {
  try {
    const session = await Session.findOne(sessionId, {
      relations: ["simulation", "phases"],
    });

    if (!session) {
      throw createHttpError(
        404,
        "Session with id " + sessionId + " is not found"
      );
    }

    const deletedSession = await session.remove();

    return deletedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function runSession(sessionId: string): Promise<Session | Error> {
  try {
    const session = await Session.findOne(sessionId, {
      relations: ["simulation", "phases"],
    });

    if (!session) {
      throw createHttpError(
        404,
        "Session with id " + sessionId + " is not found"
      );
    }

    // Run Session
    if (session.isRunning === false) {
      session.isRunning = true;
      await session.save();
    }

    return session;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function finishSession(
  sessionId: string
): Promise<Session | Error> {
  try {
    const session = await Session.findOne(sessionId, {
      relations: ["simulation", "simulation.buyers", "simulation.sellers", "phases"],
    });

    if (!session) {
      throw createHttpError(
        404,
        "Session with id " + sessionId + " is not found"
      );
    }

    // Finish Session
    session.isRunning = false;

    const allPhasesRunned = session.phases.reduce(
      (prev, phase) => prev && phase.isDone(),
      true
    );
    if (allPhasesRunned) {
      session.avgTrxPrice =
        session.phases.reduce(
          (prev, phase) => prev + Number(phase.avgTrxPrice),
          0
        ) / Number(session.phases.length);
      session.avgTrxOccurrence =
        session.phases.reduce(
          (prev, phase) => prev + Number(phase.avgTrxOccurrence),
          0
        ) / Number(session.phases.length);
      session.timeLastRun = new Date(Date.now());
    }

    const finishedSession = session.save();

    // Calculate Summary
    const calculatedSimulation = calcSimulation(session.simulation.id);
    checkIfError(calculatedSimulation);


    // Randomize unit cost, unit value, participant username & profit
    let unitValues = session.simulation.buyers.map((buyer) => (buyer.unitValue))
    let unitCosts = session.simulation.sellers.map((seller) => (seller.unitCost))
    const buyersUsername = session.simulation.buyers.map(buyer => ({
      username: buyer.username,
      profit: buyer.profit,
    }))
    const sellersUsername = session.simulation.sellers.map(seller => ({
      username: seller.username,
      profit: seller.profit,
    }))
    let participants = [...buyersUsername, ...sellersUsername,]
    console.log("initialParticipants", participants)

    session.simulation.buyers.forEach(buyer => {
      let randomNum = Math.floor(Math.random() * unitValues.length);
      buyer.unitValue = unitValues[randomNum];

      randomNum = Math.floor(Math.random() * participants.length);
      console.log("participants buyer", participants)

      buyer.username = participants[randomNum].username;
      buyer.profit = participants[randomNum].profit;

      console.log(participants[randomNum])
      buyer.save()
      unitValues.splice(randomNum, 1)
      participants.splice(randomNum, 1)

    })

    session.simulation.sellers.forEach(seller => {
      let randomNum = Math.floor(Math.random() * unitCosts.length);
      seller.unitCost = unitCosts[randomNum];

      randomNum = Math.floor(Math.random() * participants.length);
      console.log("participants seller", participants)

      seller.username = participants[randomNum].username;
      seller.profit = participants[randomNum].profit;

      console.log(participants[randomNum])
      seller.save()
      unitCosts.splice(randomNum, 1)
      participants.splice(randomNum, 1)

    })

    console.log("kenapa")
    return finishedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export type PhaseSummary = {
  id: string;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  transactionList: Transaction[];
  bargainList: Bargain[];
};

export async function getPhaseSummary(
  phase: Phase
): Promise<PhaseSummary | Error> {
  try {
    const bargains = await Bargain.createQueryBuilder("bargain")
      .where("bargain.phase_id=:phaseId", { phaseId: phase.id })
      .orderBy("bargain.time_created")
      .getMany();

    if (!bargains) {
      throw createHttpError(404, "There is no bargain with phaseId " + phase.id);
    }

    const transactions = await Transaction.createQueryBuilder("transaction")
      .where("transaction.phase_id=:phaseId", { phaseId: phase.id })
      .orderBy("transaction.time_created")
      .getMany();

    if (!transactions) {
      throw createHttpError(404, "There is no transaction with phaseId " + phase.id);
    }

    const phaseSummary: PhaseSummary = {
      id: phase.id,
      avgTrxOccurrence: phase.avgTrxOccurrence,
      avgTrxPrice: phase.avgTrxPrice,
      bargainList: bargains,
      transactionList: transactions,
    };

    return phaseSummary;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export type SessionSummary = {
  id: string;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  timeLastRun: Date;
  phaseSummary: PhaseSummary[];
};

export async function getSessionSummary(
  session: Session
): Promise<SessionSummary | Error> {
  try {
    const phaseSummaries: PhaseSummary[] = [];

    for (let i = 0; i < session.phases.length; i++) {
      const phase = session.phases[i];
      const phaseSummary = await getPhaseSummary(phase);
      if (phaseSummary instanceof Error) {
        throw phaseSummary;
      }

      phaseSummaries.push(phaseSummary);
    }

    const sessionSummary: SessionSummary = {
      id: session.id,
      avgTrxOccurrence: session.avgTrxOccurrence,
      avgTrxPrice: session.avgTrxPrice,
      timeLastRun: session.timeLastRun,
      phaseSummary: phaseSummaries,
    };

    return sessionSummary;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
