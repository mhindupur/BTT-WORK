import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";

type ClientRow = {
  id: number;
  company_name: string;
  email: string;
  phone: string | null;
  contracting_first_name: string;
  contracting_last_name: string;
  email_verified: boolean;
  password_must_change: boolean;
};

export default function AdminClients() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setErr(null);
    try {
      const list = await api<ClientRow[]>(`/admin/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setRows(list);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on q debounce omitted for brevity
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCreating(true);
    setErr(null);
    try {
      await api("/admin/clients", {
        method: "POST",
        json: {
          company_name: String(fd.get("company_name")),
          email: String(fd.get("email")),
          phone: fd.get("phone") ? String(fd.get("phone")) : null,
          office_phone: fd.get("office_phone") ? String(fd.get("office_phone")) : null,
          contracting_first_name: String(fd.get("contracting_first_name")),
          contracting_last_name: String(fd.get("contracting_last_name")),
        },
      });
      e.currentTarget.reset();
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    } finally {
      setCreating(false);
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
          <h2 style={{ marginTop: 0 }}>Clients</h2>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="primary" type="button" onClick={() => void load()}>
              Search
            </button>
          </div>
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.company_name}</td>
                  <td>{r.email}</td>
                  <td>
                    {r.contracting_first_name} {r.contracting_last_name}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </td>
                  <td>{r.email_verified ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Create client</h3>
          <p style={{ fontSize: "0.9rem", color: "#475569" }}>
            Backend logs the invitation email (SMTP not wired). Check API logs for temp password and verify link.
          </p>
          <form onSubmit={onCreate}>
            <div className="field">
              <label>Company name</label>
              <input name="company_name" required />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input name="phone" />
            </div>
            <div className="field">
              <label>Office phone</label>
              <input name="office_phone" />
            </div>
            <div className="field">
              <label>Contact first name</label>
              <input name="contracting_first_name" required />
            </div>
            <div className="field">
              <label>Contact last name</label>
              <input name="contracting_last_name" required />
            </div>
            <button className="primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create client"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
