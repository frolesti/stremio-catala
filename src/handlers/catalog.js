/**
 * Handler del catàleg.
 * Gestiona les peticions de catàleg de Stremio (Board, Discover, Search).
 * 
 * Millores respecte la versió anterior:
 * - Cerca accent-insensitive ("merli" troba "Merlí")
 * - Index precalculat per a cerques ràpides
 */
const { normalizeForSearch } = require("../utils/normalize");

// Carreguem el catàleg i precalculem l'index de cerca
const catalog = require("../../catalog.json");

// Index: afegim el nom normalitzat per cerca ràpida
const indexedCatalog = catalog.map(item => ({
    ...item,
    _searchName: normalizeForSearch(item.name)
}));

/**
 * Handler principal del catàleg.
 */
function catalogHandler({ type, id, extra }) {
    console.log(`[Catalog] ${type}/${id} search=${extra.search || '-'} sort=${extra.sort || '-'} skip=${extra.skip || 0}`);

    let results = [];

    // 1. Filtrar per tipus
    if (type === "movie" && id === "catalan_movies") {
        results = indexedCatalog.filter(item => item.type === "movie");
    } else if (type === "series" && id === "catalan_series") {
        results = indexedCatalog.filter(item => item.type === "series");
    } else {
        return Promise.resolve({ metas: [] });
    }

    // 2. Cerca accent-insensitive
    if (extra.search) {
        const query = normalizeForSearch(extra.search);
        results = results.filter(item => item._searchName.includes(query));
    }

    // 3. Ordenació
    const sortMode = extra.sort || "Més recents";
    if (sortMode === "Més recents") {
        results.sort((a, b) => new Date(b.released) - new Date(a.released));
    } else if (sortMode === "Més antigues") {
        results.sort((a, b) => new Date(a.released) - new Date(b.released));
    } else {
        results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // 4. Paginació
    const skip = parseInt(extra.skip || 0);
    const limit = 100;
    const paginatedResults = results.slice(skip, skip + limit);

    // 5. Retornar sense camps interns i amb format MetaPreview net
    const cleanResults = paginatedResults
        .filter(item => item.poster) // Excloure items sense poster (Stremio no els pot mostrar)
        .map(({ _searchName, popularity, language, released, ...item }) => item);

    // Cache agressiu: el catàleg és estàtic (catalog.json), només canvia amb redeploy.
    // - max-age=86400 (24h): cache al client Stremio
    // - staleRevalidate=604800 (7d): Vercel CDN serveix contingut antic mentre revalida
    // - staleError=2592000 (30d): si la funció falla, serveix cache antiga fins a 30 dies
    // Amb s-maxage (afegit pel middleware), la CDN cacheja 7 dies.
    // Total cobertura: fins a 14 dies sense cold start!
    return Promise.resolve({
        metas: cleanResults,
        cacheMaxAge: 86400,
        staleRevalidate: 604800,
        staleError: 2592000
    });
}

module.exports = catalogHandler;
