"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const logger_1 = __importDefault(require("./../common/utils/logger"));
const typeorm_naming_strategies_1 = require("typeorm-naming-strategies");
const config_1 = __importDefault(require("../config"));
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbType = config_1.default.database.type;
        const dbPort = config_1.default.database.port;
        const dbUsername = config_1.default.database.username;
        const dbPassword = config_1.default.database.password;
        const dbHost = config_1.default.database.host;
        const dbName = config_1.default.database.name;
        yield (0, typeorm_1.createConnection)({
            type: dbType,
            host: dbHost,
            port: dbPort,
            username: dbUsername,
            password: dbPassword,
            database: dbName,
            entities: ["src/db/entities/*.ts", "db/entities/*.js"],
            namingStrategy: new typeorm_naming_strategies_1.SnakeNamingStrategy(),
            synchronize: true,
            charset: "utf8",
            ssl: process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
        });
        logger_1.default.info(`Connected to db ${dbType}`);
    });
}
exports.default = connect;
