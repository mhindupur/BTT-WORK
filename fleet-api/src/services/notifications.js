import { execute } from "../db.js";

export async function notifyAdmin({ type, title, body = null, entityType = null, entityId = null }) {
  await execute(
    `INSERT INTO admin_notifications (type, title, body, entity_type, entity_id)
     VALUES (?,?,?,?,?)`,
    [type, title, body, entityType, entityId]
  );
}
