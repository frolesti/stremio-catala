/**
 * Proveïdor Movistar+ / Movistar Plus+.
 */
const StreamProvider = require("./base");

const MOVISTAR_IDS = [149, 339]; // Movistar Plus+, Movistar Plus+ Lite

class MovistarProvider extends StreamProvider {
    constructor() {
        super("movistar", "Movistar+", "🟢");
    }

    async getStreams({ title, tmdbProviders }) {
        if (!this._isOnPlatform(tmdbProviders)) return [];

        const encodedName = encodeURIComponent(title);
        return [{
            name: "Movistar+",
            title: `🟢 Veure "${title}" a Movistar+`,
            externalUrl: `https://ver.movistarplus.es/buscar/?text=${encodedName}`
        }];
    }

    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || []),
            ...(tmdbProviders.free || [])
        ];
        return all.some(p => MOVISTAR_IDS.includes(p.provider_id));
    }
}

module.exports = new MovistarProvider();
