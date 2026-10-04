export interface ContractPlaceholderUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  location?: {
    country?: string;
    city?: string;
    district?: string | { name?: string };
    address?: string;
  };
  coach?: {
    name?: string;
    branches?: Array<{ name?: string } | string>;
  } | null;
  participant?: {
    name?: string;
  } | null;
}

/**
 * Replaces placeholders in contract HTML or text with the logged-in user's details.
 * If user is not provided/logged in, readable fallback labels are shown.
 */
export function replaceContractPlaceholders(
  html: string,
  user?: ContractPlaceholderUser | null,
  options?: {
    date?: Date | string;
    eventName?: string;
    price?: string | number;
  }
): string {
  if (!html) return "";

  const now = options?.date ? new Date(options.date) : new Date();
  const dateFormatted = now.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.participant?.name ||
      user.coach?.name ||
      ""
    : "";

  const email = user?.email || "";
  const phone = user?.phone || user?.phoneNumber || "";

  let locationText = "";
  if (user?.location) {
    const loc = user.location;
    const districtName =
      typeof loc.district === "object" && loc.district !== null
        ? loc.district.name || ""
        : typeof loc.district === "string"
        ? loc.district
        : "";
    locationText = [districtName, loc.city, loc.country].filter(Boolean).join(" / ");
  }

  let coachBranch = "";
  if (user?.coach?.branches && user.coach.branches.length > 0) {
    coachBranch = user.coach.branches
      .map((b) => (typeof b === "object" && b !== null ? b.name : b))
      .filter(Boolean)
      .join(", ");
  }

  const eventName = options?.eventName || "";
  const eventPrice = options?.price != null ? String(options.price) : "";

  const replacements: Record<string, string> = {
    // Alıcı Ad Soyad
    "{{ALICI_AD_SOYAD}}": fullName || "[Alıcı Adı Soyadı]",
    "{{BUYER_FULL_NAME}}": fullName || "[Buyer Full Name]",
    "{{BUYER_NAME}}": fullName || "[Buyer Name]",

    // Alıcı E-posta
    "{{ALICI_EPOSTA}}": email || "[Alıcı E-posta]",
    "{{BUYER_EMAIL}}": email || "[Buyer Email]",

    // Alıcı Telefon
    "{{ALICI_TELEFON}}": phone || "[Alıcı Telefon]",
    "{{BUYER_PHONE}}": phone || "[Buyer Phone]",

    // Alıcı Konum / Adres
    "{{ALICI_KONUM}}": locationText || "[Alıcı İl / İlçe]",
    "{{ALICI_ADRES}}": locationText || "[Alıcı Adres]",
    "{{BUYER_LOCATION}}": locationText || "[Buyer Location]",

    // Koç Branş
    "{{KOC_BRANS}}": coachBranch || "[Antrenörlük Branşı]",
    "{{COACH_BRANCH}}": coachBranch || "[Coaching Branch]",

    // Etkinlik ve Ücret
    "{{ETKINLIK_ADI}}": eventName || "[Etkinlik]",
    "{{EVENT_NAME}}": eventName || "[Event Name]",
    "{{UCRET}}": eventPrice || "[Ücret]",
    "{{PRICE}}": eventPrice || "[Price]",

    // Tarih
    "{{TARIH}}": dateFormatted,
    "{{DATE}}": dateFormatted,
  };

  let result = html;
  for (const [placeholder, val] of Object.entries(replacements)) {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    result = result.replace(regex, val);
  }

  return result;
}
