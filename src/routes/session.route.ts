import { Router } from "express";
import {
  createSessionHandler,
  deleteSessionHandler,
  getAllSessionHandler,
  getOneSessionHandler,
  updateSessionHandler,
} from "../controller/session.controller";
import validate from "../middleware/validateRequest";
import {
  createSessionSchema,
  updateSessionSchema,
} from "../schema/session.schema";
const sessionRouter = Router();

sessionRouter.get("/api/sessions", getAllSessionHandler);

sessionRouter.get("/api/sessions/:id", getOneSessionHandler);

sessionRouter.put(
  "/api/sessions/:id",
  validate(updateSessionSchema),
  updateSessionHandler
);

sessionRouter.post(
  "/api/sessions",
  validate(createSessionSchema),
  createSessionHandler
);

sessionRouter.delete("/api/sessions/:id", deleteSessionHandler);

export default sessionRouter;
