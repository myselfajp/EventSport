"use client";

import { useState } from "react";
import LegalManagement from "./LegalManagement";
import ContractAcceptanceManagement from "./ContractAcceptanceManagement";
import {
  CATEGORY_LABELS,
  COACH_DOC_TYPES,
  GAMER_DOC_TYPES,
  LEGAL_DOC_TYPES,
  type ContractCategory,
} from "@/app/lib/contract-documents";

type SubTab = ContractCategory | "acceptances";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "legal", label: CATEGORY_LABELS.legal },
  { key: "gamer", label: CATEGORY_LABELS.gamer },
  { key: "coach", label: CATEGORY_LABELS.coach },
  { key: "acceptances", label: "Acceptance log" },
];

export default function ContractsManagement({
  canEditLegal = true,
  canViewAcceptances = true,
}: {
  canEditLegal?: boolean;
  canViewAcceptances?: boolean;
}) {
  const visible = SUB_TABS.filter((t) => {
    if (t.key === "acceptances") return canViewAcceptances;
    return canEditLegal;
  });

  const [subTab, setSubTab] = useState<SubTab>(visible[0]?.key ?? "legal");

  if (visible.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Bu bölüm için izniniz yok.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-3xl leading-relaxed">
        Tüm sözleşme metinleri tek kaynaktan yönetilir (Legal API). Anahtarlar İngilizce (
        <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">docType</code>
        ); site başlıkları Türkçe olabilir. Kamu sayfası:{" "}
        <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">/sozlesmeler</code>
        ; tekil belge:{" "}
        <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">/legal/[docType]</code>
        . Eski statik slug&apos;lar otomatik yönlendirilir.
      </p>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {visible.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              subTab === key
                ? "bg-cyan-600 text-white"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "legal" && (
        <LegalManagement category="legal" allowedDocTypes={LEGAL_DOC_TYPES} />
      )}
      {subTab === "gamer" && (
        <LegalManagement category="gamer" allowedDocTypes={GAMER_DOC_TYPES} />
      )}
      {subTab === "coach" && (
        <LegalManagement category="coach" allowedDocTypes={COACH_DOC_TYPES} />
      )}
      {subTab === "acceptances" && <ContractAcceptanceManagement />}
    </div>
  );
}
