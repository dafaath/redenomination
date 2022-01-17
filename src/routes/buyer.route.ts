import { Router } from "express";
import {
  createBuyerHandler,
  deleteBuyerHandler,
  getAllBuyerHandler,
  getOneBuyerHandler,
  updateBuyerHandler,
} from "../controller/buyer.controller";
import validate from "../middleware/validateRequest";
import { createBuyerSchema, updateBuyerSchema } from "../schema/buyer.schema";
const buyerRouter = Router();

buyerRouter.get("/api/buyers", getAllBuyerHandler);

buyerRouter.get("/api/buyers/:id", getOneBuyerHandler);

buyerRouter.put(
  "/api/buyers/:id",
  validate(updateBuyerSchema),
  updateBuyerHandler
);

buyerRouter.post(
  "/api/buyers",
  validate(createBuyerSchema),
  createBuyerHandler
);

buyerRouter.delete("/api/buyers/:id", deleteBuyerHandler);

export default buyerRouter;
