import type { Metadata } from "next";
import ContractsContent from "./ContractsContent";

export const metadata: Metadata = {
  title: "Agreements | Events Dashboard",
  description: "Legal agreements, terms, and policies",
};

export default function ContractsPage() {
  return <ContractsContent />;
}
