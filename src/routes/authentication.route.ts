import {
  adminLoginHandler,
  socketTokenLoginHandler,
} from "./../controller/authentication.controller";
import { Router } from "express";
import validate from "./../middleware/validateRequest";
import {
  adminLoginSchema,
  tokenLoginSchemaSocket,
} from "./../schema/authentication.schema";
import { Server, Socket } from "socket.io";
import { validateSocketInput } from "../middleware/validateSocketInput";

const authenticationRouter = Router();

authenticationRouter.post(
  "/api/sessions/admins",
  validate(adminLoginSchema),
  adminLoginHandler
);

export function registerAuthenticationSocket(io: Server, socket: Socket) {
  validateSocketInput(socket, tokenLoginSchemaSocket);
  socketTokenLoginHandler(io, socket);
}

export default authenticationRouter;
