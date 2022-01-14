"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("config"));
const config = {
    server: {
        port: config_1.default.get("server.port"),
        host: config_1.default.get("server.host"),
    },
    database: {
        type: config_1.default.get("database.type"),
        port: config_1.default.get("database.port"),
        username: config_1.default.get("database.username"),
        password: config_1.default.get("database.password"),
        host: config_1.default.get("database.host"),
        name: config_1.default.get("database.name"),
    },
};
exports.default = config;
