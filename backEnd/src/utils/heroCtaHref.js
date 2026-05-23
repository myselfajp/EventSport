const INTERNAL_HREF_RE = /^\/(?!\/)[^\s]*$/;
const HTTPS_HREF_RE = /^https:\/\/[^\s]+$/i;
const HTTP_HREF_RE = /^http:\/\/[^\s]+$/i;

export function isValidHeroCtaHref(href) {
    if (!href || typeof href !== 'string') return true;
    const h = href.trim();
    if (!h) return true;
    if (INTERNAL_HREF_RE.test(h)) return true;
    if (HTTPS_HREF_RE.test(h)) return true;
    if (process.env.NODE_ENV !== 'production' && HTTP_HREF_RE.test(h)) return true;
    return false;
}

function allowedOriginSet() {
    const raw = process.env.ALLOWED_ORIGINS;
    if (raw && raw.trim()) {
        return new Set(
            raw
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
        );
    }
    return new Set([
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        'http://localhost:3001',
    ]);
}

/**
 * Resolve stored ctaHref to a browser redirect URL.
 * Internal paths use Referer origin when allowed, else PUBLIC_FRONTEND_URL / ALLOWED_ORIGINS.
 */
export function resolveHeroCtaRedirect(ctaHref, req) {
    const h = String(ctaHref || '').trim();
    if (!h) return null;

    if (/^https?:\/\//i.test(h)) {
        return h;
    }

    if (!INTERNAL_HREF_RE.test(h)) {
        return null;
    }

    const referer = req.get('referer');
    if (referer) {
        try {
            const u = new URL(referer);
            const allowed = allowedOriginSet();
            if (allowed.has(u.origin) || process.env.NODE_ENV !== 'production') {
                return `${u.origin}${h}`;
            }
        } catch {
            /* ignore */
        }
    }

    const fallback =
        process.env.PUBLIC_FRONTEND_URL?.trim() ||
        process.env.FRONTEND_URL?.trim() ||
        [...allowedOriginSet()][0] ||
        'http://localhost:3001';

    return `${fallback.replace(/\/+$/, '')}${h}`;
}
