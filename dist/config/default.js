const dotenv = require('dotenv')

if (process.env.NODE_ENV === "production") {
  dotenv.config({
    path: "production.env"
  })
} else {
  dotenv.config({
    path: "development.env"
  })
}


module.exports = {
  server: {
    port: 3000,
    host: "localhost",
  },
  database: {
    type: "postgres",
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
  },
};