const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const manifest = {
    "id": "org.stremio.catala",
    "version": "1.3.0",
    "name": "Stremio en Català",
    "description": "Catàleg de pel·lícules en català.",
    "logo": "https://stremio-en-catala.vercel.app/logo.svg",
    "resources": [
        "catalog",
        "stream"
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

// Handler per streams - integració amb 3Cat i Filmin
builder.defineStreamHandler(async ({type, id}) => {
    console.log("request for streams: "+type+" "+id);

    // Busquem la pel·lícula/sèrie al nostre catàleg
    const item = catalog.find(meta => meta.id === id);
    
    if (!item) {
        console.log(`Item not found in catalog: ${id}`);
        return Promise.resolve({ streams: [] });
    }

    console.log(`Searching streams for: "${item.name}"`);
    const streams = [];
    const encodedName = encodeURIComponent(item.name);
    const slug = generateSlug(item.name);

    // 1. Intentem trobar un enllaç directe a 3Cat
    try {
        const threeCatDirectUrl = `https://www.3cat.cat/3cat/${slug}/`;
        const response = await fetch(threeCatDirectUrl, { method: 'HEAD', redirect: 'manual' });
        
        if (response.status === 200) {
            console.log(`  ✓ 3Cat direct match: ${threeCatDirectUrl}`);
            streams.push({
                name: "3Cat",
                title: `▶ Veure "${item.name}" a 3Cat`,
                externalUrl: threeCatDirectUrl
            });
        } else {
            console.log(`  ✗ 3Cat direct (${response.status}): ${slug}`);
        }
    } catch (error) {
        console.error("Error comprovant 3Cat directe:", error.message);
    }

    // 2. Sempre afegim cerca a 3Cat (pot haver-hi episodis o contingut relacionat)
    const threeCatSearchUrl = `https://www.3cat.cat/3cat/cercador/?text=${encodedName}`;
    streams.push({
        name: "3Cat",
        title: `🔍 Cercar "${item.name}" a 3Cat`,
        externalUrl: threeCatSearchUrl
    });

    // 3. Cerca a Filmin (plataforma de cinema en català)
    const filminSearchUrl = `https://www.filmin.cat/cerca?q=${encodedName}`;
    streams.push({
        name: "Filmin",
        title: `🔍 Cercar "${item.name}" a FilminCAT`,
        externalUrl: filminSearchUrl
    });

    console.log(`Returning ${streams.length} streams`);
    return Promise.resolve({ 
        streams,
        cacheMaxAge: 3600,           // Cache streams 1h
        staleRevalidate: 1800,       // Servir stale durant 30min mentre es revalida
        staleError: 86400            // Servir stale durant 1 dia si hi ha error
    });
});

module.exports = builder.getInterface();
