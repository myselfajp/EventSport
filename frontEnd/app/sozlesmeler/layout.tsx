import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sözleşmeler | Events Dashboard",
  description: "Antrenör sözleşmesi ve ekleri",
};

export default function SozlesmelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
