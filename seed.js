import pool from "./config/db.js";
import logger from "./config/logger.js";
import assertDatabaseMigrated from "./config/checkMigrations.js";
import { seedSampleReviews } from "./review/review.model.js";
import { seedAdminUser } from "./users/user.model.js";

const runSeed = async () => {
  try {
    await assertDatabaseMigrated();

    logger.info("Starting database seeding (sample records)...");

    await seedAdminUser();
    await seedSampleReviews();

    logger.info("Sample records inserted successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
};

runSeed();
