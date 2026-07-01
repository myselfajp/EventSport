import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agreements | Events Dashboard",
  description: "Legal agreements, terms, and policies",
};

export default function SozlesmelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
