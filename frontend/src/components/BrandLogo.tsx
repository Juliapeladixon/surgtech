type BrandLogoProps = {
  variant?: "full" | "mark";
  className?: string;
};

const LOGO_SRC = "/surgtech-logo.jpeg";

export function BrandLogo({
  variant = "full",
  className = "",
}: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src={LOGO_SRC}
        alt="SurgTech OR"
        className={`h-8 w-8 object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src={LOGO_SRC}
        alt="SurgTech OR — Safer surgeries. Better outcomes."
        className="h-auto w-full max-w-[120px] object-contain"
      />
    </div>
  );
}
