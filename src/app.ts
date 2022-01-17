import express, { Express, Request, RequestHandler, Response } from "express";
import cors from "cors";
import log from "./common/utils/logger";
import connect from "./db";
import config from "./configHandler";
import healthCheckRouter from "./routes/health-check.route";
import authenticationRouter from "./routes/authentication.route";
import sellerRouter from "./routes/seller.route";
import buyerRouter from "./routes/buyer.route";
import simulationRouter from "./routes/simulation.route";
import sessionRouter from "./routes/session.route";

const port = (process.env.PORT as unknown as number) || config.server.port;
const host = config.server.host;

const app: Express = express();

app.get("/api-docs", (_: Request, res: Response) => {
  const postmanApiUrl =
    "https://documenter.getpostman.com/view/14947205/UVXjLbeo#dc342197-c1bb-4dd9-95f8-9d101189622e";
  res.redirect(postmanApiUrl);
});
app.use(express.json({ limit: "10mb" }) as RequestHandler);
app.use(
  express.urlencoded({ extended: false, limit: "10mb" }) as RequestHandler
);
app.use(cors());
app.use(express.static("public"));
app.use(healthCheckRouter);
app.use(authenticationRouter);
app.use(sellerRouter);
app.use(buyerRouter);
app.use(simulationRouter);
app.use(sessionRouter);

export async function runApplication() {
  connect()
    .then(() => {
      app.listen(port, () => {
        log.info(`Server listing at http://${host}:${port}`);
        log.info(`Running on ${process.env.NODE_ENV} environment`);
      });
    })
    .catch((error) => {
      log.error(error);
    });
}

if (typeof require !== "undefined" && require.main === module) {
  runApplication();
}

export default app;
