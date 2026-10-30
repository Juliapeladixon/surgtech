import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { staffPath } from "../lib/catalog";
import {
  IconCard,
  IconHospital,
  IconLock,
  IconProfile,
  IconSignOut,
} from "./Icons";

const links = [
  {
    to: "/",
    end: true,
    label: "Home",
    Icon: IconHospital,
    chip: "bg-teal",
  },
  {
    to: "/profile",
    label: "Profile",
    Icon: IconProfile,
    chip: "bg-copper",
  },
];

export function ClinicLayout() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-linen">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-scrub text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="bg-paper px-4 py-4">
          <img
            src="/surgtech-logo.jpeg"
            alt="SurgTech OR"
            className="h-9 w-auto object-contain"
          />
        </Link>
        <div className="border-b border-white/10 px-4 py-4">
          <p className="mt-1 text-sm font-medium leading-snug">SurgTech OR</p>
          <p className="mt-1 text-[12px] text-white/60">
            Specialty → Doctor → Procedure
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {links.map(({ to, label, Icon, end, chip }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-2 text-[13.5px] ${
                  isActive
                    ? "bg-teal font-medium text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center text-white ${
                      isActive ? "bg-white/20" : chip
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
          <div className="px-2 pt-3 text-[11px] uppercase tracking-[0.14em] text-white/40">
            Browse
          </div>
          <div className="flex items-center gap-2.5 px-2 py-2 text-[13px] text-white/55">
            <span className="inline-flex h-7 w-7 items-center justify-center bg-white/10">
              <IconCard className="h-3.5 w-3.5" />
            </span>
            Recent · Specialties · Doctors
          </div>
        </nav>
        <div className="space-y-2 border-t border-white/10 px-4 py-4 text-[12px]">
          {staff && (
            <>
              <div className="flex items-center gap-2 text-white/80">
                <span className="inline-flex h-6 w-6 items-center justify-center bg-teal text-white">
                  <IconProfile className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate">{staff.displayName}</span>
              </div>
              {(staff.role === "ADMIN" || staff.role === "EDITOR") && (
                <Link
                  to={staffPath()}
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center bg-copper text-white">
                    <IconLock className="h-3 w-3" />
                  </span>
                  Staff tools
                </Link>
              )}
              <button
                type="button"
                className="flex items-center gap-2 text-white/70 hover:text-white"
                onClick={() => {
                  void logout().finally(() => navigate("/login"));
                }}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center bg-copper text-white">
                  <IconSignOut className="h-3 w-3" />
                </span>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-3 bg-scrub px-4 py-3 text-white lg:hidden">
          <button
            className="border border-white/25 px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <span className="truncate text-sm">SurgTech OR</span>
        </header>
        <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10">
          <Outlet />
        </main>
        <footer className="border-t border-line px-5 py-4 text-[12px] text-muted sm:px-8">
          SurgTech OR · Preference cards · No patient information is stored
        </footer>
      </div>
    </div>
  );
}
