type AuthHeroMode = "login" | "register";

const copy: Record<
  AuthHeroMode,
  { title: string; sub: string; eyebrow: string }
> = {
  login: {
    eyebrow: "SurgTech OR",
    title: "Welcome back, sign in.",
    sub: "Pick up where you left off in your preference-card file.",
  },
  register: {
    eyebrow: "SurgTech OR",
    title: "Register.",
    sub: "Create a new account to browse specialties, doctors, and preference cards.",
  },
};

export function AuthHero({ mode }: { mode: AuthHeroMode }) {
  const text = copy[mode];

  return (
    <section className="auth-hero relative hidden overflow-hidden bg-scrub lg:block">
      <img
        src="/photo-1.jpg"
        alt=""
        className="auth-hero-photo absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-scrub/70" />
      <div className="auth-hero-glow auth-hero-glow-a" aria-hidden />
      <div className="auth-hero-glow auth-hero-glow-b" aria-hidden />
      <div className="auth-hero-line" aria-hidden />

      <div className="relative flex h-full min-h-screen flex-col justify-between px-14 py-12 text-white">
        <p className="auth-hero-fade text-[13px] tracking-[0.14em] text-white/65 uppercase">
          {text.eyebrow}
        </p>
        <div className="auth-hero-rise max-w-md">
          <h1 className="font-serif text-4xl font-medium leading-tight">
            {text.title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            {text.sub}
          </p>
        </div>
        <p className="auth-hero-fade text-[12px] text-white/45">
          Preference cards · Safer surgeries
        </p>
      </div>
    </section>
  );
}
