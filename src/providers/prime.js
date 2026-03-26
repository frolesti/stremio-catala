/**
 * Proveïdor Amazon Prime Video.
 */
const StreamProvider = require("./base");

// TMDB provider_ids per Amazon Prime Video
const PRIME_IDS = [119, 2100]; // Prime Video, Prime Video with Ads

class PrimeProvider extends StreamProvider {
    constructor() {
        super("prime", "Prime Video", "📦");
    }

    async getStreams({ title, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "Prime Video",
            title: `📦 Veure "${title}" a Prime Video`,
            externalUrl: `https://www.primevideo.com/search?phrase=${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || []),
            ...(tmdbProviders.rent || []),
            ...(tmdbProviders.buy || [])
        ];
        return all.some(p => PRIME_IDS.includes(p.provider_id));
    }
}

module.exports = new PrimeProvider();
