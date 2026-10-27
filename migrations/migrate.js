import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../config/db.js";
import logger from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, ".");

export const runMigrations = async () => {
  const client = await pool.connect();

  try {
    logger.info("Starting database migrations...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows: appliedRows } = await client.query(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(appliedRows.map((r) => r.filename));

    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (sqlFiles.length === 0) {
      logger.warn("No SQL migration files found in migrations directory.");
      return;
    }

    let appliedCount = 0;

    for (const sqlFile of sqlFiles) {
      if (appliedSet.has(sqlFile)) {
        logger.debug(`Skipping already applied migration: ${sqlFile}`);
        continue;
      }

      logger.info(`Applying migration: ${sqlFile}...`);
      const filePath = path.join(MIGRATIONS_DIR, sqlFile);
      const sqlContent = await fs.readFile(filePath, "utf-8");

      try {
        await client.query("BEGIN");
        await client.query(sqlContent);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [sqlFile],
        );
        await client.query("COMMIT");
        appliedCount++;
        logger.info(`Successfully applied migration: ${sqlFile}`);
      } catch (migrationError) {
        await client.query("ROLLBACK");
        logger.error(`Failed to apply migration ${sqlFile}:`, migrationError);
        throw migrationError;
      }
    }

    if (appliedCount === 0) {
      logger.info("Database is already up to date. No new migrations applied.");
    } else {
      logger.info(
        `Migration process completed. ${appliedCount} migration(s) applied successfully.`,
      );
    }
  } finally {
    client.release();
  }
};

const isDirectExecution = process.argv[1] === __filename;

if (isDirectExecution) {
  runMigrations()
    .then(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error("Migration execution failed:", error);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}
