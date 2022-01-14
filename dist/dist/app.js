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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = __importDefault(require("./common/utils/logger"));
const db_1 = __importDefault(require("./db"));
const config_1 = __importDefault(require("./config"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const health_check_1 = __importDefault(require("./routes/health-check"));
const port = process.env.PORT || config_1.default.server.port;
const host = config_1.default.server.host;
const swaggerOptions = {
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
    apis: ["src/routes/*.ts", "routes/*.js"],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
const app = (0, express_1.default)();
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: false, limit: "10mb" }));
app.use((0, cors_1.default)());
app.use(express_1.default.static("public"));
app.use(health_check_1.default);
(0, db_1.default)();
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    app.listen(port, host, () => {
        logger_1.default.info(`Server listing at http://${host}:${port}`);
        logger_1.default.info(`Running on ${process.env.NODE_ENV} environment`);
    });
});
if (typeof require !== "undefined" && require.main === module) {
    main();
}
exports.default = app;
