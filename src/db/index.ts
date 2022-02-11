import { createConnection } from "typeorm";
import log from "./../common/utils/logger";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import config from "../configHandler";

async function connect() {
  try {
    const dbType = config.database.type as "postgres" | "mysql";
    const dbPort = config.database.port;
    const dbUsername = config.database.username;
    const dbPassword = config.database.password;
    const dbHost = config.database.host;
    const dbName = config.database.name;

    const entitiesPath =
      process.env.NODE_ENV === "production"
        ? ["dist/db/entities/*.js"]
        : ["src/db/entities/*.ts"];

    // DANGER!!! Don't change to production env
    const dropSchema = process.env.NODE_ENV === "test" ? true : false;

    log.info(`Creating connection to ${dbType}@${dbHost}:${dbPort}/${dbName}`);
    const connection = await createConnection({
      type: dbType,
      host: dbHost,
      port: dbPort,
      username: dbUsername,
      password: dbPassword,
      database: dbName,
      entities: entitiesPath,
      namingStrategy: new SnakeNamingStrategy(),
      synchronize: true,
      dropSchema: dropSchema,
      charset: "utf8",
      // ssl:
      //   process.env.NODE_ENV === "production"
      //     ? { rejectUnauthorized: false }
      //     : false,
    });
    log.info(`Connected to db ${dbType}@${dbHost}:${dbPort}/${dbName}`);
    return connection;
  } catch (error) {
    log.error(error);
    if (error instanceof Error) {
      throw error;
    } else if (typeof error === "string") {
      throw new Error(error);
    }
    return null;
  }
}

export default connect;
