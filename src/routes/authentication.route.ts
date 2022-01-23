import {
  adminLoginHandler,
  socketTokenLoginHandler,
} from "./../controller/authentication.controller";
import { Router } from "express";
import validate from "./../middleware/validateRequest";
import { adminLoginSchema } from "./../schema/authentication.schema";
import { Server, Socket } from "socket.io";

const authenticationRouter = Router();

authenticationRouter.post(
  "/api/sessions/admins",
  validate(adminLoginSchema),
  adminLoginHandler
);

export function registerAuthenticationSocket(io: Server, socket: Socket) {
  socket.on("loginToken", socketTokenLoginHandler(io, socket));
}

export default authenticationRouter;
