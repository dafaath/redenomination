import {
  handleErrorResponse,
  handleSuccessResponse,
} from "./../common/utils/responseHandler";
import { Request, Response } from "express";
import yup from "yup";
import { createSimulationSchema } from "../schema/simulation.schema";
import {
  countReadyUser,
  createSimulation,
  deleteSimulation,
  getAllSimulation,
  getOneSimulation,
  getSimulationSummary,
  saveGoodsPicture,
  updateSimulation,
} from "../service/simulation.service";
import { checkIfError } from "../common/utils/error";
import createHttpError from "http-errors";
import fileUpload from "express-fileupload";

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

export async function updateSimulationHandler(req: Request, res: Response) {
  try {
    const request = req as createSimulationRequest;
    const simulationId = req.params.id;
    const body = request.body;

    const simulation = await updateSimulation(simulationId, body);
    checkIfError(simulation);

    handleSuccessResponse(
      res,
      200,
      "Successfully updated a simulation",
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

export async function createGoodsPictureHandler(req: Request, res: Response) {
  try {
    const simulationId = req.params.id;
    const files = req.files;
    if (!files) {
      throw createHttpError(400, "There is no file uploaded");
    }
    const goodsPicture = files.file as fileUpload.UploadedFile;
    const simulation = await saveGoodsPicture(simulationId, goodsPicture);
    checkIfError(simulation);

    if (!(simulation instanceof Error)) {
      handleSuccessResponse(
        res,
        201,
        `Successfully saved simulations picture, use https://storage.googleapis.com/carbide-bongo-338115.appspot.com/${simulation.goodsPic} to see the picture`,
        simulation
      );
    }
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getReadyCountHandler(req: Request, res: Response) {
  try {
    const simulationId = req.params.id;

    const readyUserCount = await countReadyUser(simulationId);
    checkIfError(readyUserCount);

    handleSuccessResponse(
      res,
      200,
      "Successfully get simulation ready count",
      readyUserCount
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}

export async function getSimulationSummaryHandler(req: Request, res: Response) {
  try {
    const simulationId = req.params.id;
    const simulationSummary = await getSimulationSummary(simulationId);
    checkIfError(simulationSummary);

    handleSuccessResponse(
      res,
      200,
      "Successfully get simulation summary",
      simulationSummary
    );
  } catch (error) {
    handleErrorResponse(res, error);
  }
}
