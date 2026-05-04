import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";

type Mis = {
  id: number;
  title: string;
  duty_start_date: string;
  trip_end_date: string;
  trip_type: string;
  vehicle_type: string;
  status: string;
};

export default function ClientHome() {
  const [rows, setRows] = useState<Mis[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      setRows(await api<Mis[]>("/client/mis-requests"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createMis(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    try {
      await api("/client/mis-requests", {
        method: "POST",
        json: {
          title: String(fd.get("title")),
          duty_start_date: String(fd.get("duty_start_date")),
          trip_end_date: String(fd.get("trip_end_date")),
          trip_type: String(fd.get("trip_type")),
          vehicle_type: String(fd.get("vehicle_type")),
          reporting_time_place: String(fd.get("reporting_time_place")),
          destination_drop: String(fd.get("destination_drop")),
          passenger_name: fd.get("passenger_name") ? String(fd.get("passenger_name")) : null,
          passenger_email: fd.get("passenger_email") ? String(fd.get("passenger_email")) : null,
        },
      });
      setOpen(false);
      e.currentTarget.reset();
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <strong>BTT Client</strong>
        <nav style={{ marginTop: "1rem" }}>
          <Link to="/client">MIS requests</Link>
          <Link to="/login" onClick={() => setToken(null)}>
            Logout
          </Link>
        </nav>
      </aside>
      <main className="content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>MIS history</h2>
            <button className="primary" type="button" onClick={() => setOpen(true)}>
              Create MIS request
            </button>
          </div>
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
          <table style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Dates</th>
                <th>Status</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {open && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <h3>New MIS request</h3>
            <form onSubmit={createMis}>
              <div className="field">
                <label>Request title</label>
                <input name="title" required />
              </div>
              <div className="field">
                <label>Duty start date</label>
                <input name="duty_start_date" type="date" required />
              </div>
              <div className="field">
                <label>Trip end date</label>
                <input name="trip_end_date" type="date" required />
              </div>
              <div className="field">
                <label>Trip type</label>
                <select name="trip_type" required>
                  <option>Local</option>
                  <option>Outstation</option>
                  <option>Airport</option>
                </select>
              </div>
              <div className="field">
                <label>Vehicle type</label>
                <select name="vehicle_type" required>
                  <option>Sedan</option>
                  <option>SUV</option>
                  <option>Tempo</option>
                </select>
              </div>
              <div className="field">
                <label>Reporting time &amp; place</label>
                <textarea name="reporting_time_place" rows={2} required />
              </div>
              <div className="field">
                <label>Destination / drop</label>
                <textarea name="destination_drop" rows={2} required />
              </div>
              <div className="field">
                <label>Passenger name (optional)</label>
                <input name="passenger_name" />
              </div>
              <div className="field">
                <label>Passenger email (optional)</label>
                <input name="passenger_email" type="email" />
              </div>
              <button className="primary" type="submit">
                Submit
              </button>
              <button type="button" style={{ marginLeft: "0.5rem" }} onClick={() => setOpen(false)}>
                Close
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
