/**
 * Proveïdor Max (abans HBO Max).
 */
const StreamProvider = require("./base");

// TMDB provider_ids per Max/HBO
const MAX_IDS = [1899, 384]; // Max, Max Amazon Channel

class MaxProvider extends StreamProvider {
    constructor() {
        super("max", "Max", "💜");
    }

    async getStreams({ title, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "Max",
            title: `💜 Veure "${title}" a Max`,
            externalUrl: `https://play.max.com/search?q=${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || [])
        ];
        return all.some(p => MAX_IDS.includes(p.provider_id));
    }
}

module.exports = new MaxProvider();
