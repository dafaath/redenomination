import { Request, Response, Router } from "express";
import { Server, Socket } from "socket.io";
import { handleSuccessResponse } from "../common/utils/responseHandler";
const healthCheckRouter = Router();

healthCheckRouter.get("/api/", (_: Request, res: Response) => {
  handleSuccessResponse(res, 200, "server is fine");
});

export function registerCheckSocketHealth(io: Server, socket: Socket) {
  socket.on("checkHealth", () => {
    io.emit("serverMessage", "Server is fine");
  });
}

export default healthCheckRouter;
