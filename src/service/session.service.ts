import createHttpError from "http-errors";
import { errorReturnHandler } from "../common/utils/error";
import Session from "../db/entities/session.entity";
import { createSessionSchema } from "../schema/session.schema";
import yup from "yup";
import Simulation from "../db/entities/simulation.entity";

export async function getAllSession(): Promise<Array<Session> | Error> {
  try {
    const sessions = await Session.find({
      relations: ["simulation", "phases"],
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

    const session = Session.create({
      ...data,
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
