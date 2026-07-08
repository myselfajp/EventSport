import { AppError } from './appError.js';

export const HERO_CONTEXTS = ['home', 'blog', 'news'];

export function parseHeroContext(raw, { defaultContext = 'home' } = {}) {
    const ctx = String(raw || defaultContext).trim().toLowerCase();
    if (!HERO_CONTEXTS.includes(ctx)) {
        throw new AppError(400, 'Invalid hero page context');
    }
    return ctx;
}

/** Legacy slides without `context` are treated as home. */
export function buildHeroContextFilter(context = 'home') {
    if (context === 'home') {
        return {
            $or: [{ context: 'home' }, { context: { $exists: false } }, { context: null }],
        };
    }
    return { context };
}
