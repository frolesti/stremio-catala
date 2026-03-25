const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const manifest = {
    "id": "org.stremio.catala",
    "version": "1.4.0",
    "name": "Stremio en Català",
    "description": "Catàleg de pel·lícules i sèries en català amb enllaços a 3Cat i Filmin.",
    "logo": "https://stremio-en-catala.vercel.app/logo.svg",
    "resources": [
        "catalog",
        {
            "name": "stream",
            "types": ["movie", "series"],
            "idPrefixes": ["tt"]
        }
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

    return Promise.resolve({ 
        metas: paginatedResults,
        cacheMaxAge: 86400,          // Cache 24h (el catàleg s'actualitza diàriament)
        staleRevalidate: 14400,      // Servir stale durant 4h mentre es revalida
        staleError: 604800           // Servir stale durant 7 dies si hi ha error
    });
});

// Funció per generar un slug compatible amb 3Cat a partir del títol
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Treure accents
        .replace(/l·l/g, 'll')                             // l·l -> ll
        .replace(/[^a-z0-9\s-]/g, '')                      // Treure caràcters especials
        .replace(/\s+/g, '-')                               // Espais -> guions
        .replace(/-+/g, '-')                                // Múltiples guions -> un
        .replace(/^-|-$/g, '');                              // Treure guions al principi/final
}

// Extreure l'ID base d'IMDB (sense temporada/episodi)
// Stremio envia "tt1234567:1:3" per episodis de sèries
function getBaseImdbId(id) {
    return id.split(':')[0];
}

// Obtenir el títol d'un contingut via Cinemeta (l'addon oficial de Stremio)
// Això ens permet oferir streams per QUALSEVOL contingut, no només el nostre catàleg
async function getTitleFromCinemeta(type, imdbId) {
    try {
        const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
        const response = await fetch(url, { timeout: 3000 });
        if (response.ok) {
            const data = await response.json();
            return data.meta ? data.meta.name : null;
        }
    } catch (error) {
        console.error("Error fetching Cinemeta:", error.message);
    }
    return null;
}

// Cache simple en memòria per evitar repetir peticions HEAD a 3Cat
const threeCatCache = new Map();

async function check3CatDirect(slug) {
    if (threeCatCache.has(slug)) return threeCatCache.get(slug);
    
    try {
        const url = `https://www.3cat.cat/3cat/${slug}/`;
        const response = await fetch(url, { method: 'HEAD', redirect: 'manual', timeout: 3000 });
        const exists = response.status === 200;
        threeCatCache.set(slug, exists);
        // Limitar cache a 500 entrades
        if (threeCatCache.size > 500) {
            const firstKey = threeCatCache.keys().next().value;
            threeCatCache.delete(firstKey);
        }
        return exists;
    } catch (error) {
        console.error("Error checking 3Cat:", error.message);
        return false;
    }
}

// Handler per streams - integració amb 3Cat i Filmin
// Funciona per a QUALSEVOL contingut (no només el nostre catàleg)
builder.defineStreamHandler(async ({type, id}) => {
    console.log("request for streams: "+type+" "+id);

    // 1. Extreure l'IMDB ID base (sense temporada/episodi per sèries)
    const baseImdbId = getBaseImdbId(id);

    // 2. Buscar el títol: primer al nostre catàleg, després a Cinemeta
    let title = null;
    
    const catalogItem = catalog.find(meta => meta.id === baseImdbId);
    if (catalogItem) {
        title = catalogItem.name;
        console.log(`  Found in catalog: "${title}"`);
    } else {
        // Fallback: obtenir títol de Cinemeta (addon oficial de Stremio)
        title = await getTitleFromCinemeta(type, baseImdbId);
        if (title) {
            console.log(`  Found via Cinemeta: "${title}"`);
        } else {
            console.log(`  Title not found for: ${baseImdbId}`);
            return Promise.resolve({ streams: [] });
        }
    }

    const streams = [];
    const encodedName = encodeURIComponent(title);
    const slug = generateSlug(title);

    // 3. Intentem trobar un enllaç directe a 3Cat
    const has3CatPage = await check3CatDirect(slug);
    if (has3CatPage) {
        const threeCatDirectUrl = `https://www.3cat.cat/3cat/${slug}/`;
        console.log(`  ✓ 3Cat direct: ${threeCatDirectUrl}`);
        streams.push({
            name: "3Cat",
            title: `▶ Veure "${title}" a 3Cat`,
            externalUrl: threeCatDirectUrl
        });
    }

    // 4. Sempre afegim cerca a 3Cat
    streams.push({
        name: "3Cat",
        title: `🔍 Cercar "${title}" a 3Cat`,
        externalUrl: `https://www.3cat.cat/3cat/cercador/?text=${encodedName}`
    });

    // 5. Cerca a Filmin
    streams.push({
        name: "Filmin",
        title: `🔍 Cercar "${title}" a FilminCAT`,
        externalUrl: `https://www.filmin.cat/cerca?q=${encodedName}`
    });

    console.log(`  → ${streams.length} streams for "${title}"`);
    return Promise.resolve({ 
        streams,
        cacheMaxAge: 3600,
        staleRevalidate: 1800,
        staleError: 86400
    });
});

module.exports = builder.getInterface();
