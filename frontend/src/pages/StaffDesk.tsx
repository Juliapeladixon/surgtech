import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageChrome";
import {
  IconArrowRight,
  IconCard,
  IconFolder,
  IconPlus,
  IconProfile,
} from "../components/Icons";
import { useStaff } from "../context/AuthContext";
import { useDirectory } from "../context/DirectoryContext";
import { clinicHome, DEMO_CLINIC_SLUG, staffPath } from "../lib/catalog";

export function StaffDeskPage() {
  const staff = useStaff();
  const { doctorsForClinic, cardsForClinic } = useDirectory();
  const localSlug = staff.clinicSlug ?? DEMO_CLINIC_SLUG;
  const doctors = doctorsForClinic(localSlug);
  const cards = cardsForClinic(localSlug);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="Staff tools"
        title={staff.displayName}
        description={`${staff.role} · Local draft tools (admin wiring comes next).`}
        icon={<IconFolder className="h-4 w-4" />}
        action={
          <Link
            to={clinicHome()}
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/20"
          >
            Go to home
          </Link>
        }
      />

      <dl className="mt-8 grid divide-x divide-line border-y border-line bg-paper sm:grid-cols-3">
        <div className="px-5 py-5">
          <dt className="field-label">Local surgeons</dt>
          <dd className="mt-2 font-serif text-3xl">{doctors.length}</dd>
        </div>
        <div className="px-5 py-5">
          <dt className="field-label">Local cards</dt>
          <dd className="mt-2 font-serif text-3xl">{cards.length}</dd>
        </div>
        <div className="px-5 py-5">
          <dt className="field-label">Role</dt>
          <dd className="mt-2 text-lg">{staff.role}</dd>
        </div>
      </dl>

      <nav className="mt-8 divide-y divide-line border-y border-line bg-paper text-sm">
        {staff.role === "ADMIN" && (
          <Link
            to={staffPath("/users")}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-linen"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center bg-copper text-white">
              <IconProfile className="h-4 w-4" />
            </span>
            <span className="flex-1">
              Users
              <span className="ml-2 text-muted">Platform accounts</span>
            </span>
            <IconArrowRight className="h-4 w-4 text-copper" />
          </Link>
        )}
        <Link
          to={staffPath("/doctors")}
          className="flex items-center gap-3 px-5 py-3.5 hover:bg-linen"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center bg-teal text-white">
            <IconProfile className="h-4 w-4" />
          </span>
          <span className="flex-1">
            Doctors
            <span className="ml-2 text-muted">Local directory drafts</span>
          </span>
          <IconArrowRight className="h-4 w-4 text-teal" />
        </Link>
        <Link
          to={staffPath("/preference-card")}
          className="flex items-center gap-3 px-5 py-3.5 hover:bg-linen"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center bg-copper text-white">
            <IconPlus className="h-4 w-4" />
          </span>
          <span className="flex-1">
            New card
            <span className="ml-2 text-muted">Write a preference card</span>
          </span>
          <IconArrowRight className="h-4 w-4 text-copper" />
        </Link>
        <Link
          to={staffPath("/cards")}
          className="flex items-center gap-3 px-5 py-3.5 hover:bg-linen"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center bg-sky text-white">
            <IconCard className="h-4 w-4" />
          </span>
          <span className="flex-1">
            All cards
            <span className="ml-2 text-muted">Local library</span>
          </span>
          <IconArrowRight className="h-4 w-4 text-sky" />
        </Link>
      </nav>
    </div>
  );
}
