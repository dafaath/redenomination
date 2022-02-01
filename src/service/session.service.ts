import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import Session from "../db/entities/session.entity";
import { createSessionSchema } from "../schema/session.schema";
import yup from "yup";
import Simulation from "../db/entities/simulation.entity";
import Phase, { PhaseType } from "../db/entities/phase.entity";

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
      relations: ["simulation", "phases"],
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
    session.phases = session.phases.map((p) => {
      p.isRunning = true;
      return p;
    });
    session.isRunning = true;

    const runnedSession = await session.save();

    return runnedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}

export async function finishSession(
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

    // Finish Session
    session.phases = session.phases.map((p) => {
      p.isRunning = false;
      return p;
    });
    session.isRunning = false;
    const allPhasesRunned = session.phases.reduce((prev, phase) => prev && phase.isDone(), true)
    if (allPhasesRunned) { session.timeLastRun = new Date(Date.now()); }


    const finishedSession = await session.save();

    return finishedSession;
  } catch (error) {
    return errorReturnHandler(error);
  }
}
