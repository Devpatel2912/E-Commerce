import "dotenv/config";

const errors = [];

const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key] ?? defaultValue;
  return typeof value === "string" ? value.trim() : value;
};

const NODE_ENV = getEnv("NODE_ENV", "development");
const PORT = Number(getEnv("PORT", "5000"));

if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  errors.push(`PORT must be a valid integer between 1 and 65535. Received: "${process.env.PORT}"`);
}

const DB_HOST = getEnv("DB_HOST");
const DB_PORT = Number(getEnv("DB_PORT", "5432"));
const DB_NAME = getEnv("DB_NAME");
const DB_USER = getEnv("DB_USER");
const DB_PASSWORD = getEnv("DB_PASSWORD");
const DB_SSL = getEnv("DB_SSL", "false") === "true";

if (!DB_HOST) errors.push("DB_HOST is required in .env");
if (!DB_NAME) errors.push("DB_NAME is required in .env");
if (!DB_USER) errors.push("DB_USER is required in .env");
if (!DB_PASSWORD) errors.push("DB_PASSWORD is required in .env");
if (!Number.isInteger(DB_PORT) || DB_PORT <= 0 || DB_PORT > 65535) {
  errors.push(`DB_PORT must be a valid integer between 1 and 65535. Received: "${process.env.DB_PORT}"`);
}

const JWT_ACCESS_SECRET = getEnv("JWT_ACCESS_SECRET");
const JWT_REFRESH_SECRET = getEnv("JWT_REFRESH_SECRET");
const JWT_ACCESS_EXPIRES_IN = getEnv("JWT_ACCESS_EXPIRES_IN", "15m");
const JWT_REFRESH_EXPIRES_IN = getEnv("JWT_REFRESH_EXPIRES_IN", "7d");

const MIN_JWT_SECRET_LENGTH = 34;

if (!JWT_ACCESS_SECRET) {
  errors.push("JWT_ACCESS_SECRET is required in .env");
} else if (JWT_ACCESS_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  errors.push(
    `JWT_ACCESS_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long for production security (currently ${JWT_ACCESS_SECRET.length} characters).`
  );
}

if (!JWT_REFRESH_SECRET) {
  errors.push("JWT_REFRESH_SECRET is required in .env");
} else if (JWT_REFRESH_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  errors.push(
    `JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long for production security (currently ${JWT_REFRESH_SECRET.length} characters).`
  );
}

if (JWT_ACCESS_SECRET && JWT_REFRESH_SECRET && JWT_ACCESS_SECRET === JWT_REFRESH_SECRET) {
  errors.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different secrets.");
}

const COOKIE_HTTP_ONLY = getEnv("COOKIE_HTTP_ONLY", "true") === "true";
const COOKIE_SECURE = getEnv("COOKIE_SECURE", "false") === "true";
const COOKIE_SAME_SITE = getEnv("COOKIE_SAME_SITE", "lax");

const API_PREFIX = getEnv("API_PREFIX", "/api/v1");

const STORAGE_ENDPOINT =
  getEnv("NEON_STORAGE_ENDPOINT") || getEnv("AWS_ENDPOINT_URL_S3");
const STORAGE_REGION =
  getEnv("NEON_STORAGE_REGION") || getEnv("AWS_REGION") || "ap-southeast-1";
const STORAGE_BUCKET =
  getEnv("NEON_STORAGE_BUCKET") || getEnv("AWS_STORAGE_BUCKET") || "products";
const STORAGE_ACCESS_KEY_ID =
  getEnv("NEON_STORAGE_ACCESS_KEY_ID") || getEnv("AWS_ACCESS_KEY_ID");
const STORAGE_SECRET_ACCESS_KEY =
  getEnv("NEON_STORAGE_SECRET_ACCESS_KEY") || getEnv("AWS_SECRET_ACCESS_KEY");

const MAX_IMAGE_SIZE_BYTES = Number(
  getEnv("MAX_IMAGE_SIZE_BYTES", String(5 * 1024 * 1024))
);
const MAX_IMAGES_PER_LISTING = Number(getEnv("MAX_IMAGES_PER_LISTING", "10"));
const PRESIGNED_URL_EXPIRES_IN = Number(
  getEnv("PRESIGNED_URL_EXPIRES_IN", "900")
);

if (errors.length > 0) {
  const divider = "=".repeat(70);
  process.stderr.write(`\n${divider}\n`);
  process.stderr.write(`[CONFIG ERROR] Application configuration validation failed!\n`);
  process.stderr.write(`${divider}\n`);
  errors.forEach((err, index) => {
    process.stderr.write(` ${index + 1}. ${err}\n`);
  });
  process.stderr.write(`${divider}\n`);
  process.stderr.write(`Please fix the above configuration issue(s) in your .env file.\n\n`);
  process.exit(1);
}

const CORS_ORIGINS = getEnv("CORS_ORIGIN", "*")?.split(",").map((o) => o.trim()) || ["*"];
const TRUST_PROXY = getEnv("TRUST_PROXY", "1");

export const config = Object.freeze({
  env: NODE_ENV,
  isProduction: NODE_ENV === "production",
  port: PORT,
  apiPrefix: API_PREFIX,
  corsOrigins: CORS_ORIGINS.length === 1 && CORS_ORIGINS[0] === "*" ? "*" : CORS_ORIGINS,
  trustProxy: isNaN(Number(TRUST_PROXY)) ? TRUST_PROXY === "true" : Number(TRUST_PROXY),
  db: Object.freeze({
    host: DB_HOST,
    port: DB_PORT,
    name: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: DB_SSL ? { rejectUnauthorized: true } : false,
  }),
  jwt: Object.freeze({
    accessSecret: JWT_ACCESS_SECRET,
    refreshSecret: JWT_REFRESH_SECRET,
    accessExpiresIn: JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
  }),
  cookie: Object.freeze({
    httpOnly: COOKIE_HTTP_ONLY,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
  }),
  storage: Object.freeze({
    endpoint: STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    bucket: STORAGE_BUCKET,
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    maxImageSizeBytes: MAX_IMAGE_SIZE_BYTES,
    maxImagesPerListing: MAX_IMAGES_PER_LISTING,
    presignedUrlExpiresIn: PRESIGNED_URL_EXPIRES_IN,
  }),
});

export default config;
