import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";

type Mis = {
  id: number;
  client_id: number;
  title: string;
  duty_start_date: string;
  trip_end_date: string;
  trip_type: string;
  vehicle_type: string;
  reporting_time_place: string;
  destination_drop: string;
  passenger_name: string | null;
  passenger_email: string | null;
  status: string;
  assigned_vehicle: string | null;
  assigned_driver: string | null;
};

export default function AdminMis() {
  const [rows, setRows] = useState<Mis[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<number | null>(null);

  async function load() {
    try {
      setRows(await api<Mis[]>("/admin/mis-requests"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignId) return;
    const fd = new FormData(e.currentTarget);
    setErr(null);
    try {
      await api(`/admin/mis-requests/${assignId}/assign`, {
        method: "POST",
        json: {
          assigned_vehicle: String(fd.get("assigned_vehicle")),
          assigned_driver: String(fd.get("assigned_driver")),
          assigned_driver_phone: fd.get("assigned_driver_phone") ? String(fd.get("assigned_driver_phone")) : null,
        },
      });
      setAssignId(null);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Assign failed");
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <strong>BTT Admin</strong>
        <nav style={{ marginTop: "1rem" }}>
          <Link to="/admin/clients">Client management</Link>
          <Link to="/admin/accounts">Account management</Link>
          <Link to="/admin/mis">MIS requests</Link>
          <Link to="/login" onClick={() => setToken(null)}>
            Logout
          </Link>
        </nav>
      </aside>
      <main className="content">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>MIS requests</h2>
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Dates</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>
                    {r.duty_start_date} → {r.trip_end_date}
                  </td>
                  <td>{r.status}</td>
                  <td>
                    {r.status === "pending" && (
                      <button className="primary" type="button" onClick={() => setAssignId(r.id)}>
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {assignId && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <h3>Assign MIS #{assignId}</h3>
            <form onSubmit={assign}>
              <div className="field">
                <label>Vehicle</label>
                <input name="assigned_vehicle" required />
              </div>
              <div className="field">
                <label>Driver</label>
                <input name="assigned_driver" required />
              </div>
              <div className="field">
                <label>Driver phone</label>
                <input name="assigned_driver_phone" />
              </div>
              <button className="primary" type="submit">
                Save
              </button>
              <button type="button" style={{ marginLeft: "0.5rem" }} onClick={() => setAssignId(null)}>
                Cancel
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
