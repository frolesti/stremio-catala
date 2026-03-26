/**
 * Classe base per a tots els proveïdors de streaming.
 * Implementa la lògica per defecte: deep link de JustWatch → fallback TMDB + cerca.
 *
 * Per afegir una nova plataforma:
 * 1. Crea un fitxer nou a src/providers/ (ex: nouProvider.js)
 * 2. Extén StreamProvider amb els paràmetres adequats
 * 3. Registra'l a src/providers/index.js
 *
 * Paràmetres del constructor:
 * - id: identificador intern (ex: "netflix")
 * - name: nom visible a Stremio (ex: "Netflix")
 * - emoji: emoji per al títol del stream
 * - packageIds: IDs de JustWatch/TMDB per a aquesta plataforma
 * - searchUrl: URL de cerca amb {query} placeholder (fallback si no hi ha deep link)
 */
class StreamProvider {
    constructor(id, name, emoji = "🔗", packageIds = [], searchUrl = null) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.packageIds = packageIds;
        this.searchUrl = searchUrl;
    }

    /**
     * Retorna streams per a un contingut.
     * Per defecte: prova deep link JustWatch → fallback TMDB + cerca.
     * Sobreescriu per lògica personalitzada (ex: 3Cat, Torrentio).
     */
    async getStreams({ title, season, episode, jwOffers, tmdbProviders }) {
        const epLabel = this._episodeLabel(season, episode);

        // 1. Deep link directe (JustWatch)
        const deepLink = this._getDeepLink(jwOffers);
        if (deepLink) {
            return [{
                name: this.name,
                title: `${this.emoji} Veure "${title}"${epLabel} a ${this.name}`,
                externalUrl: deepLink
            }];
        }

        // 2. Fallback: TMDB confirma disponibilitat → URL de cerca
        if (this._isOnPlatform(tmdbProviders) && this.searchUrl) {
            return [{
                name: this.name,
                title: `🔍 Cercar "${title}"${epLabel} a ${this.name}`,
                externalUrl: this.searchUrl.replace('{query}', encodeURIComponent(title))
            }];
        }

        return [];
    }

    /**
     * Busca deep link de JustWatch per als packageIds d'aquest proveïdor.
     * @returns {string|null} URL directa o null
     */
    _getDeepLink(jwOffers) {
        if (!jwOffers) return null;
        for (const id of this.packageIds) {
            if (jwOffers[id]) return jwOffers[id].url;
        }
        return null;
    }

    /**
     * Comprova si el contingut és disponible via TMDB providers (fallback).
     */
    _isOnPlatform(tmdbProviders) {
        if (!tmdbProviders) return false;
        const all = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.ads || []),
            ...(tmdbProviders.free || []),
            ...(tmdbProviders.rent || []),
            ...(tmdbProviders.buy || [])
        ];
        return all.some(p => this.packageIds.includes(p.provider_id));
    }

    /**
     * Genera etiqueta de temporada/capítol per a sèries.
     */
    _episodeLabel(season, episode) {
        if (season != null && episode != null) return ` (T${season} Cap.${episode})`;
        return '';
    }
}

module.exports = StreamProvider;
