import { Link } from "react-router-dom";
import { useAuth } from "../../authContext";

export default function SmDashboard() {
  const { user } = useAuth();
  return (
    <div className="w-full max-w-xl mx-auto px-0 sm:px-1">
      <h1 className="text-xl sm:text-2xl font-bold text-btt-navy leading-tight">
        Welcome, {user?.full_name}
      </h1>
      <p className="text-slate-600 mt-3 text-sm sm:text-base leading-relaxed">
        Issue advance indents with serial, amount, and photo. Before issuing, check the vehicle&apos;s 30-day
        history to avoid over-issuance.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          to="/sm/issue-indent"
          className="block bg-btt-accent text-white text-center py-3.5 sm:py-3 rounded-xl font-medium min-h-[48px] flex items-center justify-center hover:opacity-95 active:opacity-90"
        >
          Issue advance indent
        </Link>
        <Link
          to="/sm/my-indents"
          className="block bg-white border-2 border-slate-200 text-center py-3.5 sm:py-3 rounded-xl font-medium text-btt-navy min-h-[48px] flex items-center justify-center hover:bg-slate-50 active:bg-slate-100"
        >
          My indents
        </Link>
      </div>
    </div>
  );
}
