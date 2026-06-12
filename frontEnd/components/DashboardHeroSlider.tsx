"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Settings } from "lucide-react";
import { EP } from "@/app/lib/endpoints";

export type DashboardHeroSlideDTO = {
  _id: string;
  badgeLabel: string;
  title: string;
  subtitle: string;
  image?: { path: string; mimeType?: string };
  imageAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaRequiresAdminRole?: boolean;
  order?: number;
  createdAt?: string | null;
};

const FALLBACK_SLIDES: DashboardHeroSlideDTO[] = [
  {
    _id: "__fallback",
    badgeLabel: "Dashboard",
    title: "Welcome back, {{firstName}}!",
    subtitle:
      "Your sports platform is thriving. Here's a quick overview of today's activity and upcoming events.",
    ctaLabel: "Admin Panel",
    ctaHref: "/admin-panel",
    ctaRequiresAdminRole: true,
    order: 0,
  },
];

function interpolateTitle(template: string, firstName: string) {
  return template.replace(/\{\{firstName\}\}/gi, firstName || "User");
}

function slideImageUrl(slide: DashboardHeroSlideDTO) {
  if (!slide.image?.path) return null;
  return EP.assetUrl(slide.image.path);
}

function trackedClickUrl(slide: DashboardHeroSlideDTO) {
  if (slide._id === "__fallback") {
    return slide.ctaHref || "/";
  }
  return EP.PUBLIC.heroClick(slide._id);
}

function navigateTracked(slide: DashboardHeroSlideDTO) {
  const url = trackedClickUrl(slide);
  window.location.href = url;
}

function formatAddedDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

type Props = {
  slides: DashboardHeroSlideDTO[];
  firstName?: string | null;
  userRole?: number | null;
};

function SlideContent({
  slide,
  firstName,
  userRole,
}: {
  slide: DashboardHeroSlideDTO;
  firstName: string;
  userRole: number | null;
}) {
  const imgUrl = slideImageUrl(slide);
  const showBadge = !!(slide.badgeLabel && slide.badgeLabel.trim());
  const showTitle = !!(slide.title && slide.title.trim());
  const showSubtitle = !!(slide.subtitle && slide.subtitle.trim());
  const titleText = interpolateTitle(slide.title || "", firstName);
  const canUseLink =
    !!slide.ctaHref?.trim() &&
    (!slide.ctaRequiresAdminRole || userRole === 0);
  const showCta = !!(slide.ctaLabel?.trim() && canUseLink);
  const imageOnly =
    !!imgUrl && !showTitle && !showSubtitle && !showBadge && !showCta;
  const addedLabel = formatAddedDate(slide.createdAt);

  const imageBlock = imgUrl ? (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-xl bg-slate-800/80 shrink-0 ${
        imageOnly ? "w-full min-h-[120px]" : "w-full md:w-[46%] md:max-w-xl min-h-48 py-2"
      } ${
        imageOnly && canUseLink
          ? "cursor-pointer ring-0 focus-within:ring-2 focus-within:ring-cyan-400/50"
          : ""
      }`}
      role={imageOnly && canUseLink ? "button" : undefined}
      tabIndex={imageOnly && canUseLink ? 0 : undefined}
      onClick={imageOnly && canUseLink ? () => navigateTracked(slide) : undefined}
      onKeyDown={
        imageOnly && canUseLink
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigateTracked(slide);
              }
            }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl}
        alt={slide.imageAlt || slide.title || "Banner"}
        className={`w-full object-contain object-center ${
          imageOnly ? "max-h-[min(52vw,420px)]" : "max-h-48 md:max-h-64"
        }`}
      />
    </div>
  ) : null;

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden min-h-[180px]">
      {addedLabel ? (
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm border border-white/10">
          <span className="text-[11px] font-medium text-slate-300 tracking-wide">
            Added {addedLabel}
          </span>
        </div>
      ) : null}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500/10 to-pink-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div
        className={`relative z-10 p-6 sm:p-8 ${
          imgUrl && !imageOnly
            ? "flex flex-col md:flex-row gap-6 md:items-center"
            : ""
        }`}
      >
        {imageBlock}

        {(showBadge || showTitle || showSubtitle || showCta) && (
          <div className={imgUrl && !imageOnly ? "flex-1 min-w-0" : ""}>
            {showBadge ? (
              <div className="flex items-center gap-2 mb-3">
                <div className="px-3 py-1 bg-cyan-500/20 rounded-full">
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    {slide.badgeLabel}
                  </span>
                </div>
              </div>
            ) : null}

            {showTitle ? (
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
                {titleText}
              </h2>
            ) : null}

            {showSubtitle ? (
              <p className="text-slate-400 text-base sm:text-lg max-w-xl mb-6">
                {slide.subtitle}
              </p>
            ) : showCta ? (
              <div className="mb-4" />
            ) : null}

            {showCta ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigateTracked(slide)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
                >
                  {slide.ctaRequiresAdminRole ? (
                    <Settings className="w-4 h-4" />
                  ) : null}
                  {slide.ctaLabel}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardHeroSlider({ slides, firstName, userRole }: Props) {
  const list = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; scroll: number } | null>(null);
  const [dotIdx, setDotIdx] = useState(0);

  const syncDotFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.offsetWidth || 1;
    const idx = Math.min(list.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
    setDotIdx(idx);
  }, [list.length]);

  useEffect(() => {
    syncDotFromScroll();
  }, [list.length, syncDotFromScroll]);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const id = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el || dragRef.current) return;
      const w = el.offsetWidth;
      if (!w) return;
      const idx = Math.round(el.scrollLeft / w);
      const next = (idx + 1) % list.length;
      el.scrollTo({ left: next * w, behavior: "smooth" });
    }, 8000);
    return () => window.clearInterval(id);
  }, [list.length]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    el.scrollTo({ left: i * w, behavior: "smooth" });
    setDotIdx(i);
  };

  const fn = firstName ?? "User";
  const ur = userRole ?? null;

  return (
    <div className="space-y-3">
      <div
        ref={scrollerRef}
        onScroll={syncDotFromScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-0 rounded-2xl touch-pan-x cursor-grab active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none"
        style={{ WebkitOverflowScrolling: "touch" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          const el = scrollerRef.current;
          if (!el) return;
          el.setPointerCapture(e.pointerId);
          dragRef.current = { startX: e.clientX, scroll: el.scrollLeft };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          const el = scrollerRef.current;
          if (!d || !el) return;
          el.scrollLeft = d.scroll - (e.clientX - d.startX);
        }}
        onPointerUp={(e) => {
          dragRef.current = null;
          try {
            scrollerRef.current?.releasePointerCapture(e.pointerId);
          } catch {
            /* noop */
          }
          syncDotFromScroll();
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          syncDotFromScroll();
        }}
      >
        {list.map((slide) => (
          <div
            key={slide._id}
            className="min-w-full shrink-0 snap-start snap-always px-0.5 box-border"
          >
            <SlideContent slide={slide} firstName={fn} userRole={ur} />
          </div>
        ))}
      </div>

      {list.length > 1 ? (
        <div className="flex justify-center gap-2 pt-1">
          {list.map((s, i) => (
            <button
              key={s._id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === dotIdx
                  ? "bg-cyan-500 w-6"
                  : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
