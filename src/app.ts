import express, { Express, RequestHandler } from "express";
import cors from "cors";
import log from "./common/utils/logger";
import connect from "./db";
import config from "./configHandler";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import healthCheckRouter from "./routes/health-check";

const port = (process.env.PORT as unknown as number) || config.server.port;
const host = config.server.host;

const apisPath =
  process.env.NODE_ENV === "production"
    ? ["dist/routes/*.js"]
    : ["src/routes/*.ts"];

const swaggerOptions: swaggerJsDoc.Options = {
  swaggerDefinition: {
    info: {
      version: "1.0.0",
      title: "Redenomination",
      description: "Redenomination backend API",
      contact: {
        name: "Muhammad Dafa Athaullah",
        email: "dafaathaullah123@gmail.com",
      },
      servers: [`http://${host}:${port}`],
    },
  },
  apis: apisPath,
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
const app: Express = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(express.json({ limit: "10mb" }) as RequestHandler);
app.use(
  express.urlencoded({ extended: false, limit: "10mb" }) as RequestHandler
);
app.use(cors());
app.use(express.static("public"));
app.use(healthCheckRouter);

const main = async () => {
  await connect();
  app.listen(port, host, () => {
    log.info(`Server listing at http://${host}:${port}`);
    log.info(`Running on ${process.env.NODE_ENV} environment`);
  });
};

if (typeof require !== "undefined" && require.main === module) {
  main();
}
