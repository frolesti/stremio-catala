const StreamProvider = require("./base");
const threeCatService = require("../services/threecat");

/**
 * 3Cat (TV3/CCMA).
 * Prioritat: capítol específic via API CCMA → deep link JustWatch → pàgina directa → cerca.
 * 
 * Per a sèries, utilitza l'API de la CCMA per trobar la URL exacta del capítol.
 * 
 * NOTA: Stremio utilitza Cinemeta com a font primària de metadades per a IDs IMDb.
 * No podem sobreescriure els títols i descripcions dels episodis via meta handler
 * perquè Cinemeta sempre té prioritat. Per això, mostrem el títol i resum
 * del capítol directament al stream title, que és l'únic lloc que controlem.
 */
class ThreeCatProvider extends StreamProvider {
    constructor() {
        // packageId 2237 = 3Cat a JustWatch (538 = Plex, NO és 3Cat)
        super("3cat", "3Cat", "📺", [2237], "https://www.3cat.cat/3cat/cercador/?text={query}");
    }

    /**
     * Construeix el títol del stream amb informació enriquida del capítol.
     * Inclou nom del capítol i resum perquè és l'únic lloc on podem mostrar-ho.
     */
    _buildStreamTitle(title, epLabel, episodeData) {
        let streamTitle = `▶️ Veure "${title}"${epLabel} a 3Cat`;

        if (episodeData) {
            // Nom del capítol en català (netejant prefix TxCx)
            const epTitle = this._cleanEpisodeTitle(episodeData.title);
            if (epTitle) {
                streamTitle = `▶️ "${epTitle}" a 3Cat`;
            }
            // Resum del capítol
            const desc = episodeData.description || episodeData.fullDescription;
            if (desc) {
                streamTitle += `\n📝 ${desc}`;
            }
            // Durada
            if (episodeData.duration) {
                streamTitle += `\n⏱️ ${episodeData.duration} min`;
            }
        }

        return streamTitle;
    }

    /**
     * Neteja el prefix TxCx del títol del capítol.
     * "T1xC5 - Els nostres pares" → "Els nostres pares"
     */
    _cleanEpisodeTitle(title) {
        if (!title) return '';
        return title.replace(/^T\d+xC\d+\s*[-–—]\s*/i, '').trim();
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
                    title: this._buildStreamTitle(title, epLabel, episodeData),
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
