import {
  adminLoginHandler,
  tokenLoginHandler,
} from "./../controller/authentication.controller";
import { Router } from "express";
import validate from "./../middleware/validateRequest";
import {
  adminLoginSchema,
  tokenLoginSchema,
} from "./../schema/authentication.schema";
const authenticationRouter = Router();

authenticationRouter.post(
  "/api/sessions/admins",
  validate(adminLoginSchema),
  adminLoginHandler
);

authenticationRouter.post(
  "/api/sessions/tokens",
  validate(tokenLoginSchema),
  tokenLoginHandler
);

export default authenticationRouter;
