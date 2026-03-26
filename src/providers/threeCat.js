/**
 * Proveïdor 3Cat (TV3/CCMA).
 * Comprova si el contingut té pàgina directa a 3cat.cat
 * i ofereix cerca al cercador de 3Cat.
 */
const fetch = require("node-fetch");
const StreamProvider = require("./base");
const { generateSlug } = require("../utils/normalize");
const { LRUCache } = require("../utils/cache");

const pageCache = new LRUCache(500);

class ThreeCatProvider extends StreamProvider {
    constructor() {
        super("3cat", "3Cat", "📺");
    }

    async getStreams({ title, slug, tmdbProviders }) {
        const streams = [];
        const encodedName = encodeURIComponent(title);

        // 1. Comprovar si existeix pàgina directa a 3Cat
        const directUrl = `https://www.3cat.cat/3cat/${slug}/`;
        const hasPage = await this._checkDirectPage(slug, directUrl);
        
        if (hasPage) {
            streams.push({
                name: "3Cat",
                title: `▶️ Veure "${title}" a 3Cat`,
                externalUrl: directUrl
            });
        }

        // 2. Si TMDB confirma que està a 3Cat, o si té pàgina directa, afegir cerca
        const isOn3Cat = this._isOnPlatform(tmdbProviders, [2237, 538]); // 3Cat, Plex (free)
        if (hasPage || isOn3Cat) {
            streams.push({
                name: "3Cat",
                title: `🔍 Cercar "${title}" a 3Cat`,
                externalUrl: `https://www.3cat.cat/3cat/cercador/?text=${encodedName}`
            });
        }

        return streams;
    }

    async _checkDirectPage(slug, url) {
        const cached = pageCache.get(slug);
        if (cached !== undefined) return cached;

        try {
            const response = await fetch(url, { 
                method: 'HEAD', 
                redirect: 'manual', 
                timeout: 3000 
            });
            const exists = response.status === 200;
            pageCache.set(slug, exists);
            return exists;
        } catch (error) {
            console.error(`[3Cat] Error checking ${slug}:`, error.message);
            pageCache.set(slug, false);
            return false;
        }
    }

    _isOnPlatform(tmdbProviders, providerIds) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.free || []),
            ...(tmdbProviders.ads || [])
        ];
        return all.some(p => providerIds.includes(p.provider_id));
    }
}

module.exports = new ThreeCatProvider();
