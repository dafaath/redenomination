import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import yup from "yup";
import { createSimulationSchema } from "../schema/simulation.schema";
import {
  createSimulation,
  deleteSimulation,
  getAllSimulation,
  getOneSimulation,
} from "../service/simulation.service";
import { checkIfError } from "../common/utils/error";

export async function getAllSimulationHandler(_: Request, res: Response) {
  try {
    const simulations = await getAllSimulation();
    checkIfError(simulations);

    handleSuccessResponse(
      res,
      200,
      "Successfully get all simulation",
      simulations
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getOneSimulationHandler(req: Request, res: Response) {
  try {
    const simulationId = req.params.id;
    const simulation = await getOneSimulation(simulationId);
    checkIfError(simulation);

    handleSuccessResponse(res, 200, "Successfully get simulation", simulation);
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

type createSimulationRequest = yup.InferType<typeof createSimulationSchema>;
export async function createSimulationHandler(req: Request, res: Response) {
  try {
    const request = req as createSimulationRequest;
    const body = request.body;

    const simulation = await createSimulation(body);
    checkIfError(simulation);

    handleSuccessResponse(
      res,
      201,
      "Successfully created new simulation",
      simulation
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function deleteSimulationHandler(req: Request, res: Response) {
  try {
    const simulationId = req.params.id;

    const simulation = await deleteSimulation(simulationId);
    checkIfError(simulation);

    handleSuccessResponse(
      res,
      200,
      "Successfully deleted a simulation",
      simulation
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
