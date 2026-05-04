import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

type Pay = {
  vehicle_number: string | null;
  driver_name: string | null;
  trip_count: number | null;
  fuel_advance: string | null;
  emi: string | null;
  other_advance: string | null;
  net_payable: string | null;
  period_label: string | null;
};

export default function PublicPay() {
  const { token } = useParams();
  const [data, setData] = useState<Pay | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setData(await api<Pay>(`/public/payments/${token}`));
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Not found");
      }
    })();
  }, [token]);

  async function submitQuery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    setErr(null);
    try {
      const r = await api<{ message: string }>(`/public/payments/${token}/queries`, {
        method: "POST",
        json: { message: String(fd.get("message")) },
      });
      setMsg(r.message);
      e.currentTarget.reset();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  if (err && !data) return <div className="card" style={{ margin: "2rem auto", maxWidth: 520 }}><p>{err}</p></div>;
  if (!data) return <div className="card" style={{ margin: "2rem auto" }}>Loading…</div>;

  return (
    <div className="card" style={{ margin: "2rem auto", maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Payment details</h2>
      {data.period_label && <p>Period: {data.period_label}</p>}
      <table>
        <tbody>
          <tr>
            <th>Vehicle</th>
            <td>{data.vehicle_number}</td>
          </tr>
          <tr>
            <th>Driver</th>
            <td>{data.driver_name}</td>
          </tr>
          <tr>
            <th>Trips</th>
            <td>{data.trip_count}</td>
          </tr>
          <tr>
            <th>Fuel advance</th>
            <td>{data.fuel_advance}</td>
          </tr>
          <tr>
            <th>EMI</th>
            <td>{data.emi}</td>
          </tr>
          <tr>
            <th>Other advance</th>
            <td>{data.other_advance}</td>
          </tr>
          <tr>
            <th>Net payable</th>
            <td>{data.net_payable}</td>
          </tr>
        </tbody>
      </table>
      <h3>Raise a query</h3>
      {msg && <p style={{ color: "#15803d" }}>{msg}</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      <form onSubmit={submitQuery}>
        <div className="field">
          <label>Message</label>
          <textarea name="message" rows={3} required />
        </div>
        <button className="primary" type="submit">
          Submit query
        </button>
      </form>
    </div>
  );
}
