import mysql from "mysql2/promise";
import "dotenv/config";
const environment = process.env.NODE_ENV || "development";

const {
  DB_PORT,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT_DEV,
  DB_HOST_DEV,
  DB_USER_DEV,
  DB_PASSWORD_DEV,
  DB_NAME_DEV,
} = process.env;

const optionDB = {
  development: {
    user: DB_USER_DEV,
    database: DB_NAME_DEV,
    password: DB_PASSWORD_DEV,
    port: DB_PORT_DEV,
    host: DB_HOST_DEV,
  },

  production: {
    user: DB_USER,
    database: DB_NAME,
    password: DB_PASSWORD,
    port: DB_PORT,
    host: DB_HOST,
  },
};

const option = optionDB[environment];
const access = option;
const db = mysql.createPool({
  ...access,
  keepAliveInitialDelay: 10000,
  enableKeepAlive: true,
});

export default db;
