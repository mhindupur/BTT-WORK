import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";

type Batch = { id: number; original_filename: string; row_count: number; status: string };

export default function AdminAccounts() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBatches(await api<Batch[]>("/admin/accounts/batches"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    setErr(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const token = localStorage.getItem("btt_token");
      const res = await fetch("/api/admin/accounts/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      e.currentTarget.reset();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function dispatch(id: number) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/admin/accounts/batches/${id}/dispatch-whatsapp`, { method: "POST" });
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Dispatch failed");
    } finally {
      setBusy(false);
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
          <h2 style={{ marginTop: 0 }}>Account management</h2>
          <p style={{ color: "#475569" }}>
            Upload an Excel file with columns such as Vehicle, Driver, Mobile, Trips, Fuel advance, EMI, Other advance,
            Net payable. WhatsApp dispatch is stubbed (see server logs).
          </p>
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
          <form onSubmit={onUpload} style={{ marginBottom: "1rem" }}>
            <input name="file" type="file" accept=".xlsx,.xlsm" required />
            <button className="primary" type="submit" disabled={busy} style={{ marginLeft: "0.5rem" }}>
              Upload
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Rows</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.original_filename}</td>
                  <td>{b.row_count}</td>
                  <td>
                    <button className="primary" type="button" disabled={busy} onClick={() => void dispatch(b.id)}>
                      Send WhatsApp (stub)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
