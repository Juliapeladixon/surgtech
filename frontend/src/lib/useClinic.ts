import { useDirectory } from "../context/DirectoryContext";
import { DEMO_CLINIC_SLUG } from "./catalog";

/** Public directory helpers — hospital/clinic scoping removed from routes. */
export function useClinic() {
  const {
    doctorsForClinic,
    cardsForClinic,
    getDoctor,
    getSurgeonByDoctor,
    cardsForDoctor,
  } = useDirectory();

  const clinic = {
    id: 0,
    slug: "public",
    name: "SurgTech OR",
    short_name: "SurgTech",
    city: "",
    address: "",
    phone: "",
    welcome: "",
    notices: [] as string[],
    aliases: [] as string[],
  };

  // Legacy local JSON helpers still use the old demo clinic slug.
  const doctors = doctorsForClinic(DEMO_CLINIC_SLUG);
  const cards = cardsForClinic(DEMO_CLINIC_SLUG);

  return {
    clinic,
    clinicSlug: clinic.slug,
    doctors,
    cards,
    base: "",
    getDoctor,
    getSurgeonByDoctor,
    cardsForDoctor,
  };
}
