import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="font-bold text-xl text-slate-800"
        >
          Ledger Tactica
        </Link>

        <Link
          to="/"
          className="text-slate-600 hover:text-slate-900"
        >
          Home
        </Link>

        <Link
          to="/rosters"
          className="text-slate-600 hover:text-slate-900"
        >
          Rosters
        </Link>
      </div>
    </nav>
  );
}
