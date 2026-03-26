const fetch = require("node-fetch");
const StreamProvider = require("./base");
const { LRUCache } = require("../utils/cache");

const pageCache = new LRUCache(500);

/**
 * 3Cat (TV3/CCMA).
 * Prioritat: deep link JustWatch → pàgina directa per slug → cerca.
 */
class ThreeCatProvider extends StreamProvider {
    constructor() {
        super("3cat", "3Cat", "📺", [2237, 538], "https://www.3cat.cat/3cat/cercador/?text={query}");
    }

    async getStreams({ title, slug, season, episode, jwOffers, tmdbProviders }) {
        const streams = [];
        const epLabel = this._episodeLabel(season, episode);

        // 1. Deep link directe de JustWatch (URL de vídeo específic)
        const deepLink = this._getDeepLink(jwOffers);
        if (deepLink) {
            streams.push({
                name: "3Cat",
                title: `▶️ Veure "${title}"${epLabel} a 3Cat`,
                externalUrl: deepLink
            });
            return streams;
        }

        // 2. Comprovem pàgina directa per slug (HEAD request)
        const directUrl = `https://www.3cat.cat/3cat/${slug}/`;
        const hasPage = await this._checkDirectPage(slug, directUrl);
        if (hasPage) {
            streams.push({
                name: "3Cat",
                title: `▶️ Veure "${title}"${epLabel} a 3Cat`,
                externalUrl: directUrl
            });
        }

        // 3. Fallback: cerca si TMDB confirma o si hem trobat pàgina directa
        if (hasPage || this._isOnPlatform(tmdbProviders)) {
            const encodedName = encodeURIComponent(title);
            streams.push({
                name: "3Cat",
                title: `🔍 Cercar "${title}"${epLabel} a 3Cat`,
                externalUrl: `https://www.3cat.cat/3cat/cercador/?text=${encodedName}`
            });
        }

        return streams;
    }

    async _checkDirectPage(slug, url) {
        const cached = pageCache.get(slug);
        if (cached !== undefined) return cached;
        try {
            const response = await fetch(url, { method: 'HEAD', redirect: 'manual', timeout: 3000 });
            const exists = response.status === 200;
            pageCache.set(slug, exists);
            return exists;
        } catch (error) {
            console.error(`[3Cat] Error checking ${slug}:`, error.message);
            pageCache.set(slug, false);
            return false;
        }
    }
}

module.exports = new ThreeCatProvider();
