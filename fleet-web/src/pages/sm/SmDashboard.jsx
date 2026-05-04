import { Link } from "react-router-dom";
import { useAuth } from "../../authContext";

export default function SmDashboard() {
  const { user } = useAuth();
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-btt-navy">Welcome, {user?.full_name}</h1>
      <p className="text-slate-600 mt-2">
        Issue advance indents with serial, amount, and photo. Before issuing, check the vehicle&apos;s 30-day
        history to avoid over-issuance.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          to="/sm/issue-indent"
          className="block bg-btt-accent text-white text-center py-3 rounded-xl font-medium hover:opacity-95"
        >
          Issue advance indent
        </Link>
        <Link
          to="/sm/my-indents"
          className="block bg-white border border-slate-200 text-center py-3 rounded-xl font-medium text-btt-navy"
        >
          My indents
        </Link>
      </div>
    </div>
  );
}
