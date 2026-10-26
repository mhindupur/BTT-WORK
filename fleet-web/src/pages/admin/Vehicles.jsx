import { Navigate } from "react-router-dom";

/** Vehicles are managed on the merged Sites & Vehicles screen. */
export default function AdminVehicles() {
  return <Navigate to="/admin/clients" replace />;
}
