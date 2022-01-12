import { createConnection } from "typeorm";
import log from "./../common/utils/logger";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import config from "../config";

async function connect() {
  const dbType = config.database.type as "postgres" | "mysql";
  const dbPort = config.database.port;
  const dbUsername = config.database.username;
  const dbPassword = config.database.password;
  const dbHost = config.database.host;
  const dbName = config.database.name;

  await createConnection({
    type: dbType,
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbName,
    entities: ["src/db/entities/*.ts"],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: true,
    charset: "utf8",
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  log.info(`Connected to db ${dbType}`);
}

export default connect;