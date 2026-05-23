export type CompanyType = "sponsor" | "sport";

export const COMPANY_TYPE_OPTIONS: {
  value: CompanyType;
  label: string;
  description: string;
}[] = [
  {
    value: "sponsor",
    label: "Sponsor company",
    description: "Non-sport businesses that sponsor events",
  },
  {
    value: "sport",
    label: "Sport company",
    description: "Sport organizations that operate multiple facilities",
  },
];

export function getCompanyTypeLabel(
  companyType?: CompanyType | string | null
): string {
  const option = COMPANY_TYPE_OPTIONS.find((o) => o.value === companyType);
  return option?.label ?? "Sport company";
}
