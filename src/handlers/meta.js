/**
 * Handler de metadades.
 * Enriqueix les metadades de Cinemeta amb dades de 3Cat:
 * - Títols dels capítols en català
 * - Descripcions dels capítols
 * - Miniatures de 3Cat
 * 
 * Flux:
 * 1. Obtenir meta base de Cinemeta (títol, poster, videos...)
 * 2. Si la sèrie està a 3Cat, enriquir els capítols amb dades CCMA
 * 3. Retornar la meta combinada
 */
const { generateSlug } = require("../utils/normalize");
const cinemeta = require("../services/cinemeta");
const threeCatService = require("../services/threecat");

// Catàleg local per verificar si una sèrie és nostra
const catalog = require("../../catalog.json");

/**
 * Handler principal de metadades.
 */
async function metaHandler({ type, id }) {
    console.log(`[Meta] ${type}/${id}`);

    // Només processem sèries que estan al nostre catàleg
    if (type !== "series") return { meta: null };

    const catalogItem = catalog.find(meta => meta.id === id);
    if (!catalogItem) return { meta: null };

    // 1. Obtenir meta base de Cinemeta
    const cinemataData = await cinemeta.getMeta(type, id);
    if (!cinemataData) {
        console.log(`[Meta] No s'ha trobat meta de Cinemeta per ${id}`);
        return { meta: null };
    }

    const slug = generateSlug(catalogItem.name);

    // 2. Intentar enriquir amb dades de 3Cat
    try {
        const programId = await threeCatService.getProgramId(slug);
        if (!programId) {
            console.log(`[Meta] "${catalogItem.name}" no té pàgina 3Cat`);
            return buildMetaResponse(cinemataData);
        }

        const episodes = await threeCatService.getEpisodes(programId);
        if (!episodes.length) {
            console.log(`[Meta] "${catalogItem.name}" no té capítols a 3Cat`);
            return buildMetaResponse(cinemataData);
        }

        // 3. Enriquir els videos de Cinemeta amb dades 3Cat
        const enrichedVideos = enrichVideos(cinemataData.videos || [], episodes, id);

        console.log(`[Meta] "${catalogItem.name}": ${enrichedVideos.length} capítols enriquits amb dades 3Cat`);

        return buildMetaResponse({
            ...cinemataData,
            videos: enrichedVideos,
        });
    } catch (error) {
        console.error(`[Meta] Error enriquint "${catalogItem.name}":`, error.message);
        return buildMetaResponse(cinemataData);
    }
}

/**
 * Enriqueix l'array de videos de Cinemeta amb dades de 3Cat.
 * Preserva tots els videos originals i actualitza els que tenen 
 * correspondència a 3Cat amb títols, descripcions i miniatures catalanes.
 */
function enrichVideos(cinemetaVideos, threeCatEpisodes, imdbId) {
    if (!cinemetaVideos.length && threeCatEpisodes.length) {
        // Si Cinemeta no té videos, crear-los a partir de 3Cat
        return threeCatEpisodes.map(ep => ({
            id: `${imdbId}:${ep.season}:${ep.episode}`,
            title: ep.title || `T${ep.season}xC${ep.episode}`,
            season: ep.season,
            episode: ep.episode,
            overview: ep.fullDescription || ep.description || '',
            thumbnail: ep.thumbnail || '',
        }));
    }

    // Mapem els episodis de 3Cat per accés ràpid
    const threeCatMap = new Map();
    threeCatEpisodes.forEach(ep => {
        threeCatMap.set(`${ep.season}:${ep.episode}`, ep);
    });

    return cinemetaVideos.map(video => {
        const key = `${video.season}:${video.episode}`;
        const threeCatEp = threeCatMap.get(key);

        if (!threeCatEp) return video;

        return {
            ...video,
            // Títol en català si disponible
            title: threeCatEp.title || video.title,
            // Descripció de 3Cat (molt més rica que Cinemeta per contingut català)
            overview: threeCatEp.fullDescription || threeCatEp.description || video.overview || '',
            // Miniatura de 3Cat si disponible
            thumbnail: threeCatEp.thumbnail || video.thumbnail || '',
        };
    });
}

/**
 * Construeix la resposta meta amb cache agressiu.
 */
function buildMetaResponse(meta) {
    return {
        meta,
        cacheMaxAge: 86400,
        staleRevalidate: 604800,
        staleError: 2592000
    };
}

module.exports = metaHandler;
