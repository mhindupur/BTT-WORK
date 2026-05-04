import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

function parseDatabaseUrl(url) {
  if (!url) throw new Error("DATABASE_URL is required");
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: 10,
  };
}

const pool = mysql.createPool(parseDatabaseUrl(process.env.DATABASE_URL));

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/** @returns {import('mysql2').ResultSetHeader} */
export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export { pool };
