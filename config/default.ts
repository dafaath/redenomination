import dotenv from "dotenv";
dotenv.config();

export default {
  server: {
    port: 3000,
    host: "localhost",
  },
  database: {
    type: "mysql",
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
  },
};
