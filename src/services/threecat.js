/**
 * Servei per a l'API de 3Cat (CCMA).
 * 
 * Permet:
 * - Obtenir el programatv_id d'un programa a partir del seu slug
 * - Llistar els capítols d'un programa amb metadades completes
 * - Trobar un capítol concret per temporada/episodi
 * 
 * L'API de la CCMA retorna dades riques: títol, descripció, durada, 
 * imatges, temporada, capítol, slug i ID de vídeo.
 * 
 * URL d'un capítol: https://www.3cat.cat/3cat/{nom_friendly}/video/{id}/
 */
const fetch = require("node-fetch");
const { LRUCache } = require("../utils/cache");

const CCMA_API = "https://api.3cat.cat";
const THREE_CAT_BASE = "https://www.3cat.cat/3cat";

// Cache per programatv_id (slug → id)
const programIdCache = new LRUCache(200);
// Cache per capítols (programId → episodes[])
const episodesCache = new LRUCache(100);
// Cache per pàgines existents
const pageExistsCache = new LRUCache(500);

/**
 * Comprova si una pàgina de 3Cat existeix (HEAD request).
 * @param {string} slug - Slug del programa
 * @returns {Promise<boolean>}
 */
async function checkPageExists(slug) {
    const cached = pageExistsCache.get(slug);
    if (cached !== undefined) return cached;

    try {
        const url = `${THREE_CAT_BASE}/${slug}/`;
        const response = await fetch(url, { method: 'HEAD', redirect: 'manual', timeout: 3000 });
        const exists = response.status === 200;
        pageExistsCache.set(slug, exists);
        return exists;
    } catch (error) {
        console.error(`[3Cat API] Error checking page ${slug}:`, error.message);
        pageExistsCache.set(slug, false);
        return false;
    }
}

/**
 * Obté el programatv_id d'un programa a partir del seu slug.
 * Cerca el patró programatv_id=XXXXX a la pàgina HTML del programa.
 * 
 * @param {string} slug - Slug del programa (e.g. "la-casa-nostra")
 * @returns {Promise<string|null>} L'ID del programa o null
 */
async function getProgramId(slug) {
    const cached = programIdCache.get(slug);
    if (cached !== undefined) return cached;

    try {
        const url = `${THREE_CAT_BASE}/${slug}/`;
        const response = await fetch(url, { timeout: 5000 });
        if (!response.ok) {
            programIdCache.set(slug, null);
            return null;
        }

        const html = await response.text();

        // Busquem programatv_id=XXXXX o programestv/XXXXX/
        const match = html.match(/programatv_id=(\d+)/) || html.match(/programestv\/(\d+)\//);
        if (match) {
            const programId = match[1];
            console.log(`[3Cat API] Programa "${slug}" → ID ${programId}`);
            programIdCache.set(slug, programId);
            return programId;
        }

        console.log(`[3Cat API] No s'ha trobat programatv_id per "${slug}"`);
        programIdCache.set(slug, null);
        return null;
    } catch (error) {
        console.error(`[3Cat API] Error obtenint program ID per "${slug}":`, error.message);
        programIdCache.set(slug, null);
        return null;
    }
}

/**
 * Obté tots els capítols d'un programa via l'API de la CCMA.
 * 
 * @param {string} programId - ID del programa (e.g. "74616")
 * @param {number} [maxItems=100] - Màxim de capítols a recuperar
 * @returns {Promise<Array>} Array d'objectes amb dades dels capítols
 */
async function getEpisodes(programId, maxItems = 100) {
    const cached = episodesCache.get(programId);
    if (cached !== undefined) return cached;

    try {
        const url = `${CCMA_API}/videos?_format=json&origen=auto&perfil=pc` +
            `&programatv_id=${programId}&items_pagina=${maxItems}&pagina=1` +
            `&version=2.0&https=true&master=yes`;

        const response = await fetch(url, { timeout: 8000 });
        if (!response.ok) {
            console.warn(`[3Cat API] HTTP ${response.status} per programa ${programId}`);
            episodesCache.set(programId, []);
            return [];
        }

        const data = await response.json();
        const items = data?.resposta?.items?.item || [];

        const episodes = items.map(item => {
            // Extreure temporada i capítol del permatitle (e.g., "T1xC5 - ...")
            // o de les metadades de l'API (temporades, capitol_temporada)
            const { season, episode } = parseEpisodeNumbers(item);
            return {
                id: item.id,
                season: season,
                episode: episode,
                title: item.titol || item.permatitle,
                slug: item.nom_friendly,
                description: item.entradeta_promo || item.entradeta || '',
                fullDescription: item.entradeta || '',
                duration: parseDuration(item.durada),
                showTitle: item.avantitol || item.programa || '',
                url: `${THREE_CAT_BASE}/${item.nom_friendly}/video/${item.id}/`,
                thumbnail: getEpisodeThumbnail(item.imatges),
            };
        });

        console.log(`[3Cat API] Programa ${programId}: ${episodes.length} capítols`);
        episodesCache.set(programId, episodes);
        return episodes;
    } catch (error) {
        console.error(`[3Cat API] Error obtenint capítols per programa ${programId}:`, error.message);
        episodesCache.set(programId, []);
        return [];
    }
}

/**
 * Troba un capítol concret d'un programa.
 * 
 * @param {string} slug - Slug del programa (e.g. "la-casa-nostra")
 * @param {number} season - Número de temporada
 * @param {number} episode - Número de capítol
 * @returns {Promise<Object|null>} Dades del capítol o null
 */
async function findEpisode(slug, season, episode) {
    const programId = await getProgramId(slug);
    if (!programId) return null;

    const episodes = await getEpisodes(programId);
    if (!episodes.length) return null;

    // Buscar per temporada + capítol exacte
    const match = episodes.find(ep => ep.season === season && ep.episode === episode);
    if (match) return match;

    // Fallback: buscar només per capítol (algunes sèries no tenen temporada)
    const byEpisode = episodes.find(ep => ep.episode === episode);
    if (byEpisode) {
        console.log(`[3Cat API] Capítol trobat per número ${episode} (sense temporada exacta)`);
        return byEpisode;
    }

    console.log(`[3Cat API] No s'ha trobat T${season}E${episode} a "${slug}"`);
    return null;
}

/**
 * Obté les dades completes d'un programa (descripció, metadades).
 * 
 * @param {string} slug - Slug del programa
 * @returns {Promise<Object|null>} Dades del programa o null
 */
async function getProgramInfo(slug) {
    const programId = await getProgramId(slug);
    if (!programId) return null;

    try {
        const url = `${CCMA_API}/programestv/${programId}/?_format=json&agrupar=true` +
            `&origen=llistat&pagina=1&sdom=img&version=2.0&https=true&master=yes`;

        const response = await fetch(url, { timeout: 5000 });
        if (!response.ok) return null;

        const data = await response.json();
        const item = data?.resposta?.item;
        if (!item) return null;

        return {
            id: item.id,
            title: item.titol,
            slug: item.nombonic,
            description: item.entradeta || '',
            shortDescription: item.entradeta_promo || '',
        };
    } catch (error) {
        console.error(`[3Cat API] Error obtenint info programa "${slug}":`, error.message);
        return null;
    }
}

/**
 * Parsejar durada del format CCMA "HH:MM:SS:FF" a minuts.
 */
function parseDuration(durationStr) {
    if (!durationStr) return null;
    const parts = durationStr.split(':');
    if (parts.length >= 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return Math.round(hours * 60 + minutes + seconds / 60);
    }
    return null;
}

/**
 * Extreu la temporada i el capítol del permatitle de la CCMA.
 * Formats suportats:
 *   "T1xC5 - Els nostres pares" → { season: 1, episode: 5 }
 *   "T2xC12 - El retorn" → { season: 2, episode: 12 }
 *   "C3 - Títol" → { season: 1, episode: 3 }
 */
function parsePermatitle(permatitle) {
    if (!permatitle) return null;

    // Format principal: T{season}xC{episode}
    const match = permatitle.match(/T(\d+)xC(\d+)/i);
    if (match) {
        return {
            season: parseInt(match[1]),
            episode: parseInt(match[2])
        };
    }

    return null;
}

/**
 * Extreu temporada i capítol d'un item de l'API CCMA.
 * Prioritat:
 * 1. Permatitle (T1xC5 format) - més fiable per sèries noves
 * 2. Temporades + capitol_temporada - per sèries antigues sense TxC
 * 3. Fallback a temporada 1 + capítol global
 */
function parseEpisodeNumbers(item) {
    // 1. Intentar extreure del permatitle
    const fromTitle = parsePermatitle(item.permatitle || item.titol);
    if (fromTitle) return fromTitle;

    // 2. Extreure de la metadata estructurada
    let season = 1;
    if (item.temporades && item.temporades.length > 0) {
        // temporades[0].id = "PUTEMP_6" → season 6
        const tempMatch = item.temporades[0].id?.match(/PUTEMP_(\d+)/);
        if (tempMatch) season = parseInt(tempMatch[1]);
    }

    // capitol_temporada = capítol dins de la temporada
    const episode = item.capitol_temporada || item.capitol || 1;

    return { season, episode };
}

/**
 * Obtenir la millor miniatura d'un capítol.
 */
function getEpisodeThumbnail(images) {
    if (!images || !Array.isArray(images)) return null;
    // Preferim la imatge 320x180 o la 670x378
    const preferred = images.find(img =>
        img.mida === '320x180' || img.mida === '670x378'
    );
    if (preferred) return preferred.text;
    // Fallback a qualsevol imatge que no sigui MASTER (massa gran)
    const any = images.find(img => img.mida !== 'MASTER' && img.rel_name === 'KEYVIDEO');
    return any ? any.text : null;
}

module.exports = {
    checkPageExists,
    getProgramId,
    getEpisodes,
    findEpisode,
    getProgramInfo,
};
