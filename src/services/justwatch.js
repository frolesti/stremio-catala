/**
 * Servei JustWatch.
 * Consulta l'API GraphQL de JustWatch per obtenir deep links directes
 * a les plataformes d'streaming per a contingut a Espanya.
 *
 * Les dades de JustWatch són la font original de TMDB Watch Providers.
 * IMPORTANT: Cal citar "JustWatch" com a font de dades.
 */
const fetch = require("node-fetch");
const { LRUCache } = require("../utils/cache");

const JW_GRAPHQL = "https://apis.justwatch.com/graphql";
const offersCache = new LRUCache(2000);

const SEARCH_QUERY = `query GetSearchTitles($filter: TitleFilter!, $country: Country!, $language: Language!) {
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

/**
 * Obté les ofertes de streaming d'un contingut a Espanya via JustWatch.
 * Cerca per títol i valida el resultat amb l'IMDB ID.
 *
 * @param {string} title - Títol del contingut
 * @param {string} imdbId - ID d'IMDb (tt1234567)
 * @returns {Promise<Object|null>} Mapa de packageId -> { url, monetization, name }
 */
async function getOffers(title, imdbId) {
    const cacheKey = `jw:${imdbId}`;
    const cached = offersCache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
        const res = await fetch(JW_GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: SEARCH_QUERY,
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

        // Construïm mapa: packageId -> { url, monetization, name }
        const offers = {};
        (match.node.offers || []).forEach(o => {
            const pkgId = o.package.packageId;
            // Guardem només la primera ocurrència per packageId (evitem duplicats)
            if (!offers[pkgId]) {
                offers[pkgId] = {
                    url: o.standardWebURL,
                    monetization: o.monetizationType,
                    name: o.package.clearName
                };
            }
        });

        offersCache.set(cacheKey, offers);
        return offers;
    } catch (error) {
        console.error(`[JustWatch] Error per "${title}":`, error.message);
        offersCache.set(cacheKey, null);
        return null;
    }
}

module.exports = { getOffers };
