"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_NAV_LINKS } from "@/app/lib/footer-config";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { Instagram, Facebook, Linkedin, Youtube } from "lucide-react";

const linkClass =
  "px-2 py-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors duration-200";

function footerHref(item: (typeof FOOTER_NAV_LINKS)[number]): string {
  return item.kind === "static" ? `/page/${item.slug}` : item.href;
}

interface SocialLinkItem {
  platform: string;
  url: string;
}

function SocialIcon({ platform }: { platform: string }) {
  const iconClass = "w-5 h-5 transition-colors duration-200";

  switch (platform.toLowerCase()) {
    case "instagram":
      return <Instagram className={`${iconClass} hover:text-pink-500`} />;
    case "x":
      return (
        <svg
          className={`${iconClass} hover:text-black dark:hover:text-white`}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return <Facebook className={`${iconClass} hover:text-blue-600`} />;
    case "linkedin":
      return <Linkedin className={`${iconClass} hover:text-blue-500`} />;
    case "youtube":
      return <Youtube className={`${iconClass} hover:text-red-600`} />;
    case "reddit":
      return (
        <svg
          className={`${iconClass} hover:text-orange-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SiteFooter() {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const pathname = usePathname();

  const loadSocialLinks = useCallback(async () => {
    try {
      const res = (await fetchJSON(
        EP.PUBLIC.socialLinks,
        { method: "GET" },
        { skipAuth: true }
      )) as {
        success: boolean;
        data: SocialLinkItem[];
      };
      if (res?.data && Array.isArray(res.data)) {
        const valid = res.data.filter(
          (item) => item.url && String(item.url).trim().length > 0
        );
        setSocialLinks(valid);
      }
    } catch {
      // Silently keep empty list if network error
    }
  }, []);

  useEffect(() => {
    loadSocialLinks();

    const handleUpdate = () => {
      loadSocialLinks();
    };

    window.addEventListener("eventsport:social-links-updated", handleUpdate);
    return () => {
      window.removeEventListener("eventsport:social-links-updated", handleUpdate);
    };
  }, [loadSocialLinks, pathname]);

  return (
    <footer className="mt-auto border-t border-gray-200/90 dark:border-slate-800 bg-gradient-to-b from-white via-white to-gray-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/90">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 relative">
        {/* Nav links remain strictly centered, matching original layout exactly */}
        <nav
          className="flex flex-wrap items-center justify-center gap-y-2 text-sm tracking-wide"
          aria-label="Footer navigation"
        >
          {FOOTER_NAV_LINKS.map((item, index) => (
            <span key={footerHref(item)} className="inline-flex items-center">
              {index > 0 && (
                <span
                  className="mx-2 sm:mx-3 text-gray-300 dark:text-slate-600 select-none"
                  aria-hidden
                >
                  ·
                </span>
              )}
              <Link href={footerHref(item)} className={linkClass}>
                {item.label}
              </Link>
            </span>
          ))}
        </nav>

        {/* Social media icons anchored on the right on desktop, centered underneath on mobile */}
        {socialLinks.length > 0 && (
          <div
            className="mt-4 md:mt-0 flex items-center justify-center md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 gap-3 text-gray-600 dark:text-slate-300"
            aria-label="Social media links"
          >
            {socialLinks.map((item) => {
              const targetUrl = item.url.startsWith("http")
                ? item.url
                : `https://${item.url}`;
              const label =
                item.platform.toLowerCase() === "x"
                  ? "X (Twitter)"
                  : item.platform.charAt(0).toUpperCase() + item.platform.slice(1);

              return (
                <a
                  key={item.platform}
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  aria-label={label}
                  className="p-1 hover:scale-110 transform transition-all duration-150 inline-flex items-center justify-center"
                >
                  <SocialIcon platform={item.platform} />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
