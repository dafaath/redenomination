import express, { Express, RequestHandler } from "express";
import cors from "cors";
import log from "./common/utils/logger";
import connect from "./db";
import config from "./config/handler";

const port = config.server.port;
const host = config.server.host;

const app: Express = express();

const main = async () => {
  app.use(express.json({ limit: "10mb" }) as RequestHandler);
  app.use(
    express.urlencoded({ extended: false, limit: "10mb" }) as RequestHandler
  );
  app.use(cors());
  app.use(express.static("public"));

  connect();
  app.listen(port, host, () => {
    log.info(`Server listing at http://${host}:${port}`);
  });
};

if (typeof require !== "undefined" && require.main === module) {
  main();
}
