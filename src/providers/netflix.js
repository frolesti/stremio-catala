/**
 * Proveïdor Netflix.
 * Redirigeix a la cerca de Netflix si TMDB confirma disponibilitat.
 */
const StreamProvider = require("./base");

// TMDB provider_id per Netflix
const NETFLIX_ID = 8;

class NetflixProvider extends StreamProvider {
    constructor() {
        super("netflix", "Netflix", "🔴");
    }

    async getStreams({ title, imdbId, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders, NETFLIX_ID)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "Netflix",
            title: `🔴 Veure "${title}" a Netflix`,
            externalUrl: `https://www.netflix.com/search?q=${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders, providerId) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || [])
        ];
        return all.some(p => p.provider_id === providerId);
    }
}

module.exports = new NetflixProvider();
