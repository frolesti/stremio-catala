/**
 * Servei JustWatch.
 * Consulta l'API GraphQL de JustWatch per obtenir deep links directes
 * a les plataformes d'streaming per a contingut a Espanya.
 *
 * Per a sèries, consulta ofertes a NIVELL DE TEMPORADA (no de sèrie),
 * ja que cada temporada pot estar a plataformes diferents.
 * Ex: Filmin pot tenir T1-T2 de Plats Bruts però no T6.
 *
 * Les dades de JustWatch són la font original de TMDB Watch Providers.
 * IMPORTANT: Cal citar "JustWatch" com a font de dades.
 */
const fetch = require("node-fetch");
const { LRUCache } = require("../utils/cache");

const JW_GRAPHQL = "https://apis.justwatch.com/graphql";
const offersCache = new LRUCache(2000);

// Query per a pel·lícules (ofertes a nivell de títol)
const MOVIE_QUERY = `query GetMovieOffers($filter: TitleFilter!, $country: Country!, $language: Language!) {
    popularTitles(country: $country, filter: $filter, first: 10) {
        edges {
            node {
                objectType
                objectId
                content(country: $country, language: $language) {
                    title
                    fullPath
                    externalIds { imdbId }
                }
                offers(country: $country, platform: WEB) {
                    monetizationType
                    standardWebURL
                    package { packageId clearName }
                }
            }
        }
    }
}`;

// Query per a sèries (ofertes a nivell de TEMPORADA)
const SHOW_QUERY = `query GetShowSeasonOffers($filter: TitleFilter!, $country: Country!, $language: Language!) {
    popularTitles(country: $country, filter: $filter, first: 10) {
        edges {
            node {
                objectType
                objectId
                content(country: $country, language: $language) {
                    title
                    fullPath
                    externalIds { imdbId }
                }
                ... on Show {
                    seasons {
                        content(country: $country, language: $language) {
                            seasonNumber
                        }
                        offers(country: $country, platform: WEB) {
                            monetizationType
                            standardWebURL
                            package { packageId clearName }
                        }
                    }
                }
                offers(country: $country, platform: WEB) {
                    monetizationType
                    standardWebURL
                    package { packageId clearName }
                }
            }
        }
    }
}`;

/**
 * Construeix mapa d'ofertes a partir d'un array d'offers JustWatch.
 * @returns {Object} packageId -> { url, monetization, name }
 */
function buildOffersMap(offers) {
    const map = {};
    (offers || []).forEach(o => {
        const pkgId = o.package.packageId;
        if (!map[pkgId]) {
            map[pkgId] = {
                url: o.standardWebURL,
                monetization: o.monetizationType,
                name: o.package.clearName
            };
        }
    });
    return map;
}

/**
 * Obté les ofertes de streaming d'un contingut a Espanya via JustWatch.
 * Per a sèries amb temporada especificada, retorna ofertes d'aquella temporada.
 *
 * @param {string} title - Títol del contingut
 * @param {string} imdbId - ID d'IMDb (tt1234567)
 * @param {number|null} season - Número de temporada (null per a pel·lícules)
 * @returns {Promise<Object|null>} Mapa de packageId -> { url, monetization, name }
 */
async function getOffers(title, imdbId, season = null) {
    const cacheKey = season != null ? `jw:${imdbId}:s${season}` : `jw:${imdbId}`;
    const cached = offersCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const isShow = season != null;
    const query = isShow ? SHOW_QUERY : MOVIE_QUERY;

    try {
        const res = await fetch(JW_GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: {
                    filter: { searchQuery: title },
                    country: "ES",
                    language: "ca"
                }
            }),
            timeout: 5000
        });

        if (!res.ok) {
            console.warn(`[JustWatch] HTTP ${res.status} per "${title}"`);
            offersCache.set(cacheKey, null);
            return null;
        }

        const data = await res.json();
        if (data.errors) {
            console.warn(`[JustWatch] GraphQL error:`, data.errors[0]?.message);
            offersCache.set(cacheKey, null);
            return null;
        }

        const edges = data?.data?.popularTitles?.edges || [];

        // Busquem el resultat correcte validant per IMDB ID
        const match = edges.find(e => e.node.content?.externalIds?.imdbId === imdbId);
        if (!match) {
            console.log(`[JustWatch] Cap resultat amb IMDB ${imdbId} entre ${edges.length} resultats per "${title}"`);
            offersCache.set(cacheKey, null);
            return null;
        }

        const node = match.node;
        let offers;

        if (isShow && node.seasons) {
            // Per a sèries: buscar les ofertes de la temporada específica
            const seasonData = node.seasons.find(s => s.content?.seasonNumber === season);
            if (seasonData && seasonData.offers && seasonData.offers.length > 0) {
                offers = buildOffersMap(seasonData.offers);
                console.log(`[JustWatch] "${title}" T${season}: ${Object.keys(offers).length} plataformes (per temporada)`);
            } else {
                // Fallback: ofertes a nivell de sèrie si no trobem la temporada
                offers = buildOffersMap(node.offers);
                console.log(`[JustWatch] "${title}" T${season}: temporada no trobada, usant ofertes de sèrie (${Object.keys(offers).length} plataformes)`);
            }
        } else {
            // Per a pel·lícules: ofertes directes
            offers = buildOffersMap(node.offers);
        }

        offersCache.set(cacheKey, offers);
        return offers;
    } catch (error) {
        console.error(`[JustWatch] Error per "${title}":`, error.message);
        offersCache.set(cacheKey, null);
        return null;
    }
}

module.exports = { getOffers };
