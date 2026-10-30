import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clinicHome, staffPath } from "../lib/catalog";
import {
  IconCard,
  IconFolder,
  IconHospital,
  IconPlus,
  IconProfile,
  IconSignOut,
} from "./Icons";

const links = (isAdmin: boolean) => [
  {
    to: staffPath(),
    label: "Overview",
    Icon: IconFolder,
    end: true,
    chip: "bg-sky",
  },
  ...(isAdmin
    ? [
        {
          to: staffPath("/users"),
          label: "Users",
          Icon: IconProfile,
          chip: "bg-copper",
        },
      ]
    : []),
  {
    to: staffPath("/doctors"),
    label: "Doctors",
    Icon: IconProfile,
    chip: "bg-teal",
  },
  {
    to: staffPath("/preference-card"),
    label: "New card",
    Icon: IconPlus,
    chip: "bg-copper",
  },
  {
    to: staffPath("/cards"),
    label: "Cards",
    Icon: IconCard,
    chip: "bg-sky",
  },
];

export function StaffLayout({ children }: { children: ReactNode }) {
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
        <div className="flex items-center gap-3 bg-paper px-4 py-4">
          <img
            src="/surgtech-logo.jpeg"
            alt="SurgTech OR"
            className="h-9 w-auto object-contain"
          />
        </div>
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-sky">
            Staff tools
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">SurgTech OR</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {links(staff?.role === "ADMIN").map(({ to, label, Icon, end, chip }) => (
            <NavLink
              key={to}
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
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-sm font-medium">{staff?.displayName}</p>
          <p className="text-[12px] text-sky">{staff?.role}</p>
          <div className="mt-3 flex flex-col items-start gap-2 text-[12px]">
            <NavLink
              to={clinicHome()}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center bg-sky text-white">
                <IconHospital className="h-3 w-3" />
              </span>
              Home
            </NavLink>
            <button
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"
              onClick={() => {
                void logout().finally(() => {
                  navigate("/login");
                });
              }}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center bg-copper text-white">
                <IconSignOut className="h-3 w-3" />
              </span>
              Sign out
            </button>
          </div>
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
          <span className="truncate text-sm">SurgTech · Staff</span>
        </header>
        <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
