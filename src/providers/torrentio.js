/**
 * Proveïdor Torrentio.
 * Consulta l'API pública de Torrentio per obtenir torrents reproduïbles directament a Stremio.
 * 
 * A diferència dels altres proveïdors (que redirigeixen a plataformes),
 * Torrentio retorna streams reals amb infoHash que Stremio pot reproduir.
 * 
 * Per a sèries, necessitem l'ID complet (tt1234567:1:3) per obtenir
 * l'episodi concret, no només la sèrie sencera.
 */
const fetch = require("node-fetch");
const StreamProvider = require("./base");

const TORRENTIO_BASE = "https://torrentio.strem.fun";

// Filtre de qualitat: configuració per defecte (totes les qualitats)
// Es pot personalitzar afegint paràmetres a la URL base
const TORRENTIO_CONFIG = "";

class TorrentioProvider extends StreamProvider {
    constructor() {
        super("torrentio", "Torrentio", "🧲");
    }

    /**
     * Consulta Torrentio i retorna els streams disponibles.
     * @param {Object} context
     * @param {string} context.fullId - ID complet (tt1234567 o tt1234567:1:3)
     * @param {string} context.type - "movie" o "series"
     */
    async getStreams({ fullId, type }) {
        if (!fullId || !type) return [];

        try {
            const url = `${TORRENTIO_BASE}${TORRENTIO_CONFIG}/stream/${type}/${fullId}.json`;
            const response = await fetch(url, { timeout: 6000 });

            if (!response.ok) return [];

            const data = await response.json();
            if (!data.streams || data.streams.length === 0) return [];

            // Retornem els streams tal com vénen de Torrentio
            // Stremio sap interpretar el format infoHash + fileIdx
            return data.streams.map(stream => ({
                name: stream.name || "Torrentio",
                title: stream.title || "Torrent",
                infoHash: stream.infoHash,
                fileIdx: stream.fileIdx,
                ...(stream.behaviorHints && { behaviorHints: stream.behaviorHints })
            }));
        } catch (error) {
            console.error(`[Torrentio] Error per ${fullId}:`, error.message);
            return [];
        }
    }
}

module.exports = new TorrentioProvider();
