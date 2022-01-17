import { Router } from "express";
import {
  createSellerHandler,
  deleteSellerHandler,
  getAllSellerHandler,
  getOneSellerHandler,
  updateSellerHandler,
} from "../controller/seller.controller";
import validate from "../middleware/validateRequest";
import {
  createSellerSchema,
  updateSellerSchema,
} from "../schema/seller.schema";
const sellerRouter = Router();

sellerRouter.get("/api/sellers", getAllSellerHandler);

sellerRouter.get("/api/sellers/:id", getOneSellerHandler);

sellerRouter.put(
  "/api/sellers/:id",
  validate(updateSellerSchema),
  updateSellerHandler
);

sellerRouter.post(
  "/api/sellers",
  validate(createSellerSchema),
  createSellerHandler
);

sellerRouter.delete("/api/sellers/:id", deleteSellerHandler);

export default sellerRouter;
