import { Router } from "express";
import {
  createSimulationHandler,
  deleteSimulationHandler,
  getAllSimulationHandler,
  getOneSimulationHandler,
  updateSimulationHandler,
} from "../controller/simulation.controller";
import validate from "../middleware/validateRequest";
import {
  createSimulationSchema,
  updateSimulationSchema,
} from "../schema/simulation.schema";
const simulationRouter = Router();

simulationRouter.get("/api/simulations", getAllSimulationHandler);

simulationRouter.get("/api/simulations/:id", getOneSimulationHandler);

simulationRouter.put(
  "/api/simulations/:id",
  validate(updateSimulationSchema),
  updateSimulationHandler
);

simulationRouter.post(
  "/api/simulations",
  validate(createSimulationSchema),
  createSimulationHandler
);

simulationRouter.delete("/api/simulations/:id", deleteSimulationHandler);

export default simulationRouter;
