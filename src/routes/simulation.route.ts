import { Router } from "express";
import { ROLE } from "../common/utils/jwt";
import {
  clearShortlivedHandler,
  createGoodsPictureHandler,
  createSimulationHandler,
  deleteSimulationHandler,
  getAllSimulationHandler,
  getAnovaSummaryHandler,
  getOneSimulationHandler,
  getReadyCountHandler,
  getSimulationSummaryHandler,
  updateSimulationHandler,
} from "../controller/simulation.controller";
import validateAuthentication from "../middleware/validateAuthentication";
import validate from "../middleware/validateRequest";
import {
  createSimulationSchema,
  updateSimulationSchema,
} from "../schema/simulation.schema";
const simulationRouter = Router();

simulationRouter.use(validateAuthentication(ROLE.ADMIN));

simulationRouter.get("/api/anova", getAnovaSummaryHandler);

simulationRouter.get("/api/clear-shortlived", clearShortlivedHandler);

simulationRouter.get("/api/simulations", getAllSimulationHandler);

simulationRouter.get("/api/simulations/:id", getOneSimulationHandler);

simulationRouter.get(
  "/api/simulations/:id/summary",
  getSimulationSummaryHandler
);

simulationRouter.get("/api/simulations/:id/readyCount", getReadyCountHandler);

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

simulationRouter.post(
  "/api/simulations/:id/pictures",
  createGoodsPictureHandler
);

simulationRouter.delete("/api/simulations/:id", deleteSimulationHandler);

export default simulationRouter;
