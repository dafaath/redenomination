import express, { Express, RequestHandler } from "express";
import cors from "cors";
import log from "./common/utils/logger";
import connect from "./db";
import config from "./configHandler";
import swaggerUi from "swagger-ui-express";
import healthCheckRouter from "./routes/health-check.route";
import authenticationRouter from "./routes/authentication.route";
import YAML from "yamljs";

const port = config.server.port;
const host = config.server.host;

const app: Express = express();
const swaggerDocument = YAML.load("public/openapi.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json({ limit: "10mb" }) as RequestHandler);
app.use(
  express.urlencoded({ extended: false, limit: "10mb" }) as RequestHandler
);
app.use(cors());
app.use(express.static("public"));
app.use(healthCheckRouter);
app.use(authenticationRouter);

connect()
  .then(() => {
    app.listen(port, host, () => {
      log.info(`Server listing at http://${host}:${port}`);
      log.info(`Running on ${process.env.NODE_ENV} environment`);
    });
  })
  .catch((error) => {
    log.error(error);
  });
