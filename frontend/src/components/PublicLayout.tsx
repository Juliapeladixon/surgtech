import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconFolder, IconLock } from "./Icons";

export function PublicLayout() {
  const { staff } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line border-t-4 border-t-teal bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/surgtech-logo.jpeg"
              alt="SurgTech OR"
              className="h-10 w-auto object-contain"
            />
            <span className="hidden border-l border-line pl-3 text-[13px] text-muted sm:block">
              Clinic files
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px]">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-ink hover:text-teal"
            >
              <IconFolder className="h-3.5 w-3.5 text-teal" />
              Clinics
            </Link>
            {staff ? (
              <Link
                to="/staff"
                className="inline-flex items-center gap-1.5 text-ink hover:text-teal"
              >
                <IconLock className="h-3.5 w-3.5 text-sky" />
                Records
              </Link>
            ) : (
              <Link
                to="/staff/login"
                className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
              >
                <IconLock className="h-3.5 w-3.5 text-sky" />
                Staff access
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl border-t border-line px-5 py-5 text-[12px] text-muted sm:px-8">
        SurgTech OR · Theatre preference cards · No patient information is stored
      </footer>
    </div>
  );
}
