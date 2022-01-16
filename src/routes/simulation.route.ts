import { Router } from "express";
import {
  createSimulationHandler,
  deleteSimulationHandler,
  getAllSimulationHandler,
  getOneSimulationHandler,
} from "../controller/simulation.controller";
import validate from "../middleware/validateRequest";
import { createSimulationSchema } from "../schema/simulation.schema";
const simulationRouter = Router();

simulationRouter.get("/api/simulations", getAllSimulationHandler);

simulationRouter.get("/api/simulations/:id", getOneSimulationHandler);

simulationRouter.post(
  "/api/simulations",
  validate(createSimulationSchema),
  createSimulationHandler
);

simulationRouter.delete("/api/simulations/:id", deleteSimulationHandler);

export default simulationRouter;
