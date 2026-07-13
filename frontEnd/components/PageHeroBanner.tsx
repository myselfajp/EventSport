"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import DashboardHeroSlider, {
  type DashboardHeroSlideDTO,
} from "@/components/DashboardHeroSlider";

export type HeroPageContext = "home" | "blog" | "news" | "videos";

function mapHeroSlides(data: Record<string, unknown>[]): DashboardHeroSlideDTO[] {
  return data.map((row) => {
    const img = row.image as { path?: string; mimeType?: string } | undefined;
    return {
      _id: String(row._id),
      badgeLabel: String(row.badgeLabel ?? ""),
      title: String(row.title ?? ""),
      subtitle: String(row.subtitle ?? ""),
      imageAlt: row.imageAlt ? String(row.imageAlt) : undefined,
      image:
        img?.path != null && img.path !== ""
          ? { path: String(img.path), mimeType: img.mimeType ? String(img.mimeType) : undefined }
          : undefined,
      ctaLabel: row.ctaLabel ? String(row.ctaLabel) : undefined,
      ctaHref: row.ctaHref ? String(row.ctaHref) : undefined,
      ctaRequiresAdminRole: !!row.ctaRequiresAdminRole,
      order: typeof row.order === "number" ? row.order : 0,
    };
  });
}

export default function PageHeroBanner({
  context,
  useFallback = false,
}: {
  context: HeroPageContext;
  useFallback?: boolean;
}) {
  const { data: user } = useMe();
  const [slides, setSlides] = useState<DashboardHeroSlideDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void fetchJSON(EP.PUBLIC.dashboardHeroSlides(context), { method: "GET" }, { skipAuth: true })
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setSlides(mapHeroSlides(res.data as Record<string, unknown>[]));
        } else {
          setSlides([]);
        }
      })
      .catch(() => {
        if (!cancelled) setSlides([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [context]);

  if (!loaded) return null;
  if (slides.length === 0 && !useFallback) return null;

  return (
    <DashboardHeroSlider
      slides={slides}
      firstName={user?.firstName}
      userRole={user?.role ?? null}
      useFallback={useFallback}
    />
  );
}
