/**
 * Servei TMDB Watch Providers.
 * Consulta a quines plataformes d'streaming està disponible un contingut a Espanya.
 * 
 * Utilitza l'API de TMDB (watch/providers) que conté dades de JustWatch.
 * IMPORTANT: Cal citar "JustWatch" com a font (requisit de TMDB).
 */
const fetch = require("node-fetch");
const { LRUCache } = require("../utils/cache");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_READ_TOKEN;
const WATCH_REGION = "ES"; // Espanya

const tmdbIdCache = new LRUCache(2000);
const providersCache = new LRUCache(2000);

/**
 * Obté l'ID de TMDB a partir d'un ID d'IMDb.
 * @param {string} imdbId - ID d'IMDb (tt1234567)
 * @param {string} type - "movie" o "series"
 * @returns {Promise<number|null>}
 */
async function getTmdbId(imdbId, type) {
    const cacheKey = `${type}:${imdbId}`;
    const cached = tmdbIdCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (!TMDB_TOKEN) {
        console.warn("[TMDB] No TMDB_READ_TOKEN configured");
        return null;
    }

    try {
        const response = await fetch(
            `${TMDB_BASE}/find/${imdbId}?external_source=imdb_id`,
            {
                headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
                timeout: 4000
            }
        );
        if (!response.ok) return null;
        
        const data = await response.json();
        const resultKey = type === "movie" ? "movie_results" : "tv_results";
        const tmdbId = data[resultKey]?.[0]?.id || null;
        tmdbIdCache.set(cacheKey, tmdbId);
        return tmdbId;
    } catch (error) {
        console.error(`[TMDB] Error finding ${imdbId}:`, error.message);
        return null;
    }
}

/**
 * Obté els proveïdors de streaming per a un contingut a Espanya.
 * @param {string} imdbId - ID d'IMDb
 * @param {string} type - "movie" o "series"
 * @returns {Promise<Object|null>} Objecte amb flatrate, free, ads, rent, buy arrays
 */
async function getWatchProviders(imdbId, type) {
    const cacheKey = `wp:${type}:${imdbId}`;
    const cached = providersCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const tmdbId = await getTmdbId(imdbId, type);
    if (!tmdbId) {
        providersCache.set(cacheKey, null);
        return null;
    }

    try {
        const mediaType = type === "movie" ? "movie" : "tv";
        const response = await fetch(
            `${TMDB_BASE}/${mediaType}/${tmdbId}/watch/providers`,
            {
                headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
                timeout: 4000
            }
        );
        if (!response.ok) return null;

        const data = await response.json();
        const providers = data.results?.[WATCH_REGION] || null;
        providersCache.set(cacheKey, providers);
        return providers;
    } catch (error) {
        console.error(`[TMDB] Error getting providers for ${imdbId}:`, error.message);
        providersCache.set(cacheKey, null);
        return null;
    }
}

module.exports = { getWatchProviders, getTmdbId };
