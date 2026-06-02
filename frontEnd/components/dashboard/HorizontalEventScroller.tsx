"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HorizontalEventScrollerProps = {
  itemCount: number;
  children: React.ReactNode;
  /** Tailwind classes for the active pagination dot */
  activeDotClass?: string;
  ariaLabel?: string;
  /** One full-width card per slide (dashboard column layout) */
  columnSlide?: boolean;
};

export default function HorizontalEventScroller({
  itemCount,
  children,
  activeDotClass = "bg-cyan-500",
  ariaLabel = "Event carousel",
  columnSlide = false,
}: HorizontalEventScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; scroll: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getScrollStep = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 280;
    if (columnSlide) return el.clientWidth + 12;
    const card = el.querySelector("[data-event-card]") as HTMLElement | null;
    return (card?.offsetWidth ?? 280) + 12;
  }, [columnSlide]);

  const syncFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = getScrollStep();
    const idx = Math.min(
      Math.max(0, itemCount - 1),
      Math.max(
        0,
        columnSlide
          ? Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
          : Math.round(el.scrollLeft / step)
      )
    );
    setActiveIdx(idx);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [columnSlide, getScrollStep, itemCount]);

  useEffect(() => {
    syncFromScroll();
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => syncFromScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [itemCount, syncFromScroll]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * getScrollStep(), behavior: "smooth" });
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * getScrollStep(), behavior: "smooth" });
    setActiveIdx(index);
  };

  const showControls = itemCount > 1;

  return (
    <div className="relative">
      {showControls && canScrollLeft && (
        <button
          type="button"
          aria-label="Previous event"
          onClick={() => scrollByStep(-1)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/95 border border-gray-200 dark:border-slate-600 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-colors -ml-1"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-slate-200" />
        </button>
      )}

      {showControls && canScrollRight && (
        <button
          type="button"
          aria-label="Next event"
          onClick={() => scrollByStep(1)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/95 border border-gray-200 dark:border-slate-600 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-colors -mr-1"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-slate-200" />
        </button>
      )}

      <div
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        onScroll={syncFromScroll}
        className={`flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none ${columnSlide ? "[&>[data-event-card]]:min-w-full [&>[data-event-card]]:w-full" : ""}`}
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
          syncFromScroll();
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          syncFromScroll();
        }}
      >
        {children}
      </div>

      {showControls && (
        <div className="flex justify-center gap-1.5 pt-3">
          {Array.from({ length: itemCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to event ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx
                  ? `${activeDotClass} w-5`
                  : "w-1.5 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
