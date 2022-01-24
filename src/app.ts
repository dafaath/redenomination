import express, { Express, Request, RequestHandler, Response } from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import log from "./common/utils/logger";
import connect from "./db";
import config from "./configHandler";
import healthCheckRouter, {
  registerCheckSocketHealth,
} from "./routes/health-check.route";
import authenticationRouter, {
  registerAuthenticationSocket,
} from "./routes/authentication.route";
import sellerRouter from "./routes/seller.route";
import buyerRouter from "./routes/buyer.route";
import simulationRouter from "./routes/simulation.route";
import sessionRouter from "./routes/session.route";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { disconnectTokenSocket } from "./service/authentication.service";
import {
  socketHandleErrorResponse,
  socketHandleSuccessResponse,
} from "./common/utils/responseHandler";
import { checkIfError, errorThrowUtils } from "./common/utils/error";

export const appRoot = path.join(path.resolve(__dirname), "..");

const port = (process.env.PORT as unknown as number) || config.server.port;
const host = config.server.host;

const app: Express = express();

// Documentation
app.get("/api-docs", (_: Request, res: Response) => {
  const postmanApiUrl =
    "https://documenter.getpostman.com/view/14947205/UVXjLbeo#dc342197-c1bb-4dd9-95f8-9d101189622e";
  res.redirect(postmanApiUrl);
});

// Middleware
app.use(express.json({ limit: "10mb" }) as RequestHandler);
app.use(
  express.urlencoded({ extended: false, limit: "10mb" }) as RequestHandler
);
app.use(cors({ credentials: true, origin: true }));
app.use("/static", express.static("public"));
app.use(fileUpload());

// Router
app.use(healthCheckRouter);
app.use(authenticationRouter);
app.use(sellerRouter);
app.use(buyerRouter);
app.use(simulationRouter);
app.use(sessionRouter);

// Socket.io setup
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
}).listen(server);

export const onConnection = (socket: Socket) => {
  log.info(`New user has connected with id ${socket.id}`);
  socket.emit("serverMessage", `New user has connected with id ${socket.id}`);

  // Importing socket event routes
  registerCheckSocketHealth(io, socket);
  registerAuthenticationSocket(io, socket);

  socket.on("disconnect", async () => {
    try {
      await disconnectTokenSocket(socket.id);
      checkIfError(disconnectTokenSocket);

      log.info(`User ${socket.id} has been disconnected`);
      socketHandleSuccessResponse(
        socket,
        200,
        `User ${socket.id} has been disconnected`
      );
    } catch (error) {
      socketHandleErrorResponse(socket, error);
    }
  });
};

export async function runApplication() {
  try {
    const dbConnection = await connect();
    const ioConnection = io.on("connection", onConnection);
    const serverConnection = server.listen(port, () => {
      log.info(`Server listing at http://${host}:${port}`);
      log.info(`Running on ${process.env.NODE_ENV} environment`);
    });

    return { dbConnection, ioConnection, serverConnection };
  } catch (error) {
    log.error(error);
    errorThrowUtils(error);
  }
}

if (typeof require !== "undefined" && require.main === module) {
  runApplication();
}

export default app;
