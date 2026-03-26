/**
 * Proveïdor SkyShowtime.
 */
const StreamProvider = require("./base");

const SKYSHOWTIME_ID = 1773;

class SkyShowtimeProvider extends StreamProvider {
    constructor() {
        super("skyshowtime", "SkyShowtime", "🌤️");
    }

    async getStreams({ title, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "SkyShowtime",
            title: `🌤️ Veure "${title}" a SkyShowtime`,
            externalUrl: `https://www.skyshowtime.com/search?query=${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || [])
        ];
        return all.some(p => p.provider_id === SKYSHOWTIME_ID);
    }
}

module.exports = new SkyShowtimeProvider();
