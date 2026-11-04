import pg from "pg";
import config from "./env.js";
import logger from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl,
});

pool.on("connect", () => {
    logger.debug("New PostgreSQL client connected to pool.");
});

pool.on("error", (error) => {
    logger.error("Unexpected PostgreSQL pool error:", error);
});

export default pool;
