import { Router } from "express";
import {
  createSellerHandler,
  deleteSellerHandler,
  getAllSellerHandler,
  getOneSellerHandler,
} from "../controller/seller.controller";
import validate from "../middleware/validateRequest";
import { createSellerSchema } from "../schema/seller.schema";
const sellerRouter = Router();

sellerRouter.get("/api/sellers", getAllSellerHandler);

sellerRouter.get("/api/sellers/:id", getOneSellerHandler);

sellerRouter.post(
  "/api/sellers",
  validate(createSellerSchema),
  createSellerHandler
);

sellerRouter.delete("/api/sellers/:id", deleteSellerHandler);

export default sellerRouter;
