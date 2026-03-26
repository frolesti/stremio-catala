/**
 * Proveïdor Disney+.
 */
const StreamProvider = require("./base");

const DISNEY_ID = 337; // TMDB provider_id per Disney+

class DisneyProvider extends StreamProvider {
    constructor() {
        super("disney", "Disney+", "🏰");
    }

    async getStreams({ title, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "Disney+",
            title: `🏰 Veure "${title}" a Disney+`,
            externalUrl: `https://www.disneyplus.com/search/${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || [])
        ];
        return all.some(p => p.provider_id === DISNEY_ID);
    }
}

module.exports = new DisneyProvider();
