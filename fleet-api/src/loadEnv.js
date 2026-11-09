import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/** Always load fleet-api/.env from this package, regardless of PM2 cwd. */
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiRoot, ".env") });

export { apiRoot };
