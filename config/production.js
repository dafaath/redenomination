module.exports = {
  server: {
    port: 3000,
    host: "localhost",
  },
  database: {
    type: process.env.DB_TYPE,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
  },
  admin: {
    password: process.env.ADMIN_PASSWORD
  },
  jwt: {
    key: process.env.JWT_KEY
  }
};