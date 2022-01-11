import nodeConfig from "config";

const config = {
  server: {
    port: nodeConfig.get<number>("server.port"),
    host: nodeConfig.get<string>("server.host"),
  },
  database: {
    type: nodeConfig.get<string>("database.type"),
    port: nodeConfig.get<number>("database.port"),
    username: nodeConfig.get<string>("database.username"),
    password: nodeConfig.get<string>("database.password"),
    host: nodeConfig.get<string>("database.host"),
    name: nodeConfig.get<string>("database.name"),
  },
};

export default config;
