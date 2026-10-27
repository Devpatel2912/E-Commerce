import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

const REQUIRED_TABLES = [
    "schema_migrations",
    "users",
    "refresh_tokens",
    "categories",
    "listings",
    "listing_images",
    "search_history",
    "payments",
    "transactions",
    "refunds",
    "reviews",
    "messages",
];

export const assertDatabaseMigrated = async () => {
    const client = await pool.connect();

    try {
        const { rows: tableCheck } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'schema_migrations';
    `);

        if (tableCheck.length === 0) {
            logger.error(
                "[FATAL] Database migrations have NOT been executed! The 'schema_migrations' table does not exist.",
            );
            logger.error(
                "[FATAL] Run 'npm run migrate' to create all database tables before starting the project.",
            );
            process.exit(1);
        }

        const files = await fs.readdir(MIGRATIONS_DIR);
        const sqlFiles = files.filter((file) => file.endsWith(".sql"));

        const { rows: appliedRows } = await client.query(
            "SELECT filename FROM schema_migrations;",
        );
        const appliedSet = new Set(appliedRows.map((r) => r.filename));

        const pendingMigrations = sqlFiles.filter((f) => !appliedSet.has(f));

        if (pendingMigrations.length > 0) {
            logger.error(
                `[FATAL] Database is missing migrations! Pending migration(s): ${pendingMigrations.join(", ")}`,
            );
            logger.error(
                "[FATAL] Run 'npm run migrate' to apply pending migrations before starting the project.",
            );
            process.exit(1);
        }

        const { rows: existingTablesRows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);

        const existingTablesSet = new Set(
            existingTablesRows.map((r) => r.table_name),
        );
        const missingTables = REQUIRED_TABLES.filter(
            (t) => !existingTablesSet.has(t),
        );

        if (missingTables.length > 0) {
            logger.error(
                `[FATAL] Missing required database table(s): ${missingTables.join(", ")}`,
            );
            logger.error(
                "[FATAL] Run 'npm run migrate' to initialize the database schema before starting the project.",
            );
            process.exit(1);
        }

        logger.info(
            "Database schema preflight check passed: all tables and migrations are up to date.",
        );
    } catch (error) {
        logger.error("Failed to verify database migration status:", error);
        process.exit(1);
    } finally {
        client.release();
    }
};

export default assertDatabaseMigrated;
