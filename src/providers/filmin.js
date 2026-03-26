/**
 * Proveïdor Filmin / FilminCAT.
 * Filmin és una plataforma independent amb molt contingut en català.
 */
const StreamProvider = require("./base");

// TMDB provider_id per Filmin
const FILMIN_ID = 63;

class FilminProvider extends StreamProvider {
    constructor() {
        super("filmin", "Filmin", "🎬");
    }

    async getStreams({ title, tmdbProviders }) {
        const streams = [];
        const encodedName = encodeURIComponent(title);

        const isOnFilmin = this._isOnPlatform(tmdbProviders, FILMIN_ID);

        if (isOnFilmin) {
            streams.push({
                name: "FilminCAT",
                title: `🎬 Veure "${title}" a FilminCAT`,
                externalUrl: `https://www.filmin.cat/cerca?q=${encodedName}`
            });
        }

        return streams;
    }

    _isOnPlatform(tmdbProviders, providerId) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.free || []),
            ...(tmdbProviders.ads || []),
            ...(tmdbProviders.rent || []),
            ...(tmdbProviders.buy || [])
        ];
        return all.some(p => p.provider_id === providerId);
    }
}

module.exports = new FilminProvider();
