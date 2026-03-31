const StreamProvider = require("./base");
const threeCatService = require("../services/threecat");

/**
 * 3Cat (TV3/CCMA).
 * Prioritat: capítol específic via API CCMA → deep link JustWatch → pàgina directa → cerca.
 * 
 * Per a sèries, utilitza l'API de la CCMA per trobar la URL exacta del capítol.
 * Les descripcions i títols dels capítols s'exposen via el meta handler.
 */
class ThreeCatProvider extends StreamProvider {
    constructor() {
        // packageId 2237 = 3Cat a JustWatch (538 = Plex, NO és 3Cat)
        super("3cat", "3Cat", "📺", [2237], "https://www.3cat.cat/3cat/cercador/?text={query}");
    }

    async getStreams({ title, slug, season, episode, jwOffers, tmdbProviders }) {
        const streams = [];
        const epLabel = this._episodeLabel(season, episode);
        const isSeries = season != null && episode != null;

        // 1. Per a sèries: intentar trobar el capítol exacte via API CCMA
        if (isSeries) {
            const episodeData = await threeCatService.findEpisode(slug, season, episode);
            if (episodeData) {
                streams.push({
                    name: "3Cat",
                    title: `▶️ Veure "${title}"${epLabel} a 3Cat`,
                    externalUrl: episodeData.url
                });
                return streams;
            }
        }

        // 2. Deep link directe de JustWatch (URL de vídeo específic)
        const deepLink = this._getDeepLink(jwOffers);
        if (deepLink) {
            streams.push({
                name: "3Cat",
                title: `▶️ Veure "${title}"${epLabel} a 3Cat`,
                externalUrl: deepLink
            });
            return streams;
        }

        // 3. Comprovem pàgina directa per slug (HEAD request)
        const directUrl = `https://www.3cat.cat/3cat/${slug}/`;
        const hasPage = await threeCatService.checkPageExists(slug);
        if (hasPage) {
            streams.push({
                name: "3Cat",
                title: `▶️ Veure "${title}"${epLabel} a 3Cat`,
                externalUrl: directUrl
            });
        }

        // 4. Fallback: cerca si TMDB confirma o si hem trobat pàgina directa
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
}

module.exports = new ThreeCatProvider();
