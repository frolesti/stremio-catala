const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
    "id": "org.stremio.catala",
    "version": "1.0.0",
    "name": "Stremio en Català",
    "description": "Catàleg de pel·lícules en català.",
    "logo": "https://stremio-en-catala.vercel.app/logo.svg",
    "resources": [
        "catalog"
    ],
    "types": [
        "movie",
        "series"
    ],
    "catalogs": [
        {
            "type": "movie",
            "id": "catalan_movies",
            "name": "Pel·lícules en Català",
            "extra": [
                { "name": "search", "isRequired": false },
                { "name": "skip", "isRequired": false },
                { "name": "sort", "options": ["Més recents", "Popularitat", "Més antigues"], "isRequired": false }
            ]
        },
        {
            "type": "series",
            "id": "catalan_series",
            "name": "Sèries en Català",
            "extra": [
                { "name": "search", "isRequired": false },
                { "name": "skip", "isRequired": false },
                { "name": "sort", "options": ["Més recents", "Popularitat", "Més antigues"], "isRequired": false }
            ]
        }
    ]
};

const builder = new addonBuilder(manifest);

// Carreguem el catàleg del fitxer JSON
const catalog = require("./catalog.json");

builder.defineCatalogHandler(({type, id, extra}) => {
    console.log("request for catalog: "+type+" "+id);
    
    let results = [];

    // 1. Filtrem per tipus (pel·lícula o sèrie)
    if (type === "movie" && id === "catalan_movies") {
        results = catalog.filter(item => item.type === "movie");
    } else if (type === "series" && id === "catalan_series") {
        results = catalog.filter(item => item.type === "series");
    } else {
        return Promise.resolve({ metas: [] });
    }

    // 2. Cerca (Search)
    if (extra.search) {
        const query = extra.search.toLowerCase();
        results = results.filter(item => item.name.toLowerCase().includes(query));
    }

    // 3. Ordenació (Sort)
    // Per defecte ordenem per data (més recents) si no s'especifica res
    const sortMode = extra.sort || "Més recents";

    if (sortMode === "Més recents") {
        results.sort((a, b) => new Date(b.released) - new Date(a.released));
    } else if (sortMode === "Més antigues") {
        results.sort((a, b) => new Date(a.released) - new Date(b.released));
    } else {
        // Popularitat (descendent)
        results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // 4. Paginació (Skip / Limit)
    const skip = parseInt(extra.skip || 0);
    const limit = 100; // Stremio sol demanar blocs de 100
    const paginatedResults = results.slice(skip, skip + limit);

    return Promise.resolve({ metas: paginatedResults });
});

module.exports = builder.getInterface();
