/**
 * Servei per obtenir metadades de Cinemeta (addon oficial de Stremio).
 * Permet resoldre títols de continguts que no estan al nostre catàleg.
 */
const fetch = require("node-fetch");
const { LRUCache } = require("../utils/cache");

const CINEMETA_BASE = "https://v3-cinemeta.strem.io";
const cache = new LRUCache(1000);

/**
 * Obté el títol d'un contingut via Cinemeta.
 * @param {string} type - "movie" o "series"
 * @param {string} imdbId - ID d'IMDb (e.g. "tt1234567")
 * @returns {Promise<string|null>} El títol o null si no es troba
 */
async function getTitle(type, imdbId) {
    const cacheKey = `title:${type}:${imdbId}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
        const url = `${CINEMETA_BASE}/meta/${type}/${imdbId}.json`;
        const response = await fetch(url, { timeout: 4000 });
        if (response.ok) {
            const data = await response.json();
            const title = data.meta ? data.meta.name : null;
            cache.set(cacheKey, title);
            return title;
        }
    } catch (error) {
        console.error(`[Cinemeta] Error fetching ${imdbId}:`, error.message);
    }
    
    cache.set(cacheKey, null);
    return null;
}

/**
 * Obté les metadades completes d'un contingut via Cinemeta.
 * Inclou poster, descripció, videos (episodis), etc.
 * 
 * @param {string} type - "movie" o "series"
 * @param {string} imdbId - ID d'IMDb (e.g. "tt1234567")
 * @returns {Promise<Object|null>} Objecte meta complet o null
 */
async function getMeta(type, imdbId) {
    const cacheKey = `meta:${type}:${imdbId}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
        const url = `${CINEMETA_BASE}/meta/${type}/${imdbId}.json`;
        const response = await fetch(url, { timeout: 5000 });
        if (response.ok) {
            const data = await response.json();
            const meta = data.meta || null;
            cache.set(cacheKey, meta);
            return meta;
        }
    } catch (error) {
        console.error(`[Cinemeta] Error fetching meta ${imdbId}:`, error.message);
    }

    cache.set(cacheKey, null);
    return null;
}

module.exports = { getTitle, getMeta };
