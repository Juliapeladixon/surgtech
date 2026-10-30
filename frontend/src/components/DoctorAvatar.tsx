type AvatarDoctor = {
  title?: string;
  doctor_name: string;
};

function initials(doctor: AvatarDoctor) {
  const parts = doctor.doctor_name.split(" ").filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "");
  return letters.toUpperCase() || (doctor.title?.slice(0, 1) ?? "?");
}

export function DoctorAvatar({
  doctor,
  size = "md",
  className = "",
}: {
  doctor: AvatarDoctor;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-14 w-14 text-sm",
  };

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-scrub font-medium tracking-wide text-white ${sizes[size]} ${className}`}
    >
      {initials(doctor)}
    </span>
  );
}
