"use client";

import {
  splitConsentLabel,
  type SignupConsentDocument,
} from "@/app/lib/contract-documents";

const LINK_CLASS =
  "text-cyan-500 dark:text-cyan-400 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors underline";

export default function RegistrationConsentLabel({
  label,
  documents,
  onOpen,
}: {
  label: string;
  documents: SignupConsentDocument[];
  onOpen: (doc: SignupConsentDocument) => void;
}) {
  const parts = splitConsentLabel(label);
  const mentioned = new Set(
    parts.filter((part) => part.type === "token").map((part) => part.value)
  );
  const extra = documents.filter((doc) => !mentioned.has(doc.docType));

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`t-${index}`}>{part.value}</span>;
        }
        const doc = documents.find((item) => item.docType === part.value);
        if (!doc) {
          return <span key={`m-${index}`}>{`{{${part.value}}}`}</span>;
        }
        return (
          <button
            key={`m-${index}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(doc);
            }}
            className={LINK_CLASS}
          >
            {doc.title}
          </button>
        );
      })}
      {extra.map((doc) => (
        <span key={doc.docType}>
          {" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(doc);
            }}
            className={LINK_CLASS}
          >
            {doc.title}
          </button>
        </span>
      ))}
    </>
  );
}
