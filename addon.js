const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const manifest = {
    "id": "org.stremio.catala.dev",
    "version": "1.2.0",
    "name": "Stremio en Català (Local Test)",
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

// Handler per streams - integració amb 3Cat
builder.defineStreamHandler(async ({type, id}) => {
    console.log("request for streams: "+type+" "+id);

    // Busquem la pel·lícula/sèrie al nostre catàleg
    const item = catalog.find(meta => meta.id === id);
    
    if (!item) {
        console.log(`Item not found in catalog: ${id}`);
        return Promise.resolve({ streams: [] });
    }

    console.log(`Searching for: "${item.name}"`);
    const streams = [];

    try {
        // Cerquem a l'API de 3Cat
        const searchQuery = encodeURIComponent(item.name);
        const searchUrl = `https://api.3cat.cat/cercador/tot?_format=json&text=${searchQuery}&tipologia=DTY_VIDEO_MM,WCR_AUDIO_MM&items_pagina=10&pagina=1&version=2.0`;
        
        console.log(`3Cat API URL: ${searchUrl}`);
        const response = await fetch(searchUrl);
        const data = await response.json();

        console.log(`API status: ${data.resposta?.status}, items: ${data.resposta?.items?.num || 0}`);

        if (data.resposta && data.resposta.status === "OK" && data.resposta.items && data.resposta.items.item) {
            const results = Array.isArray(data.resposta.items.item) 
                ? data.resposta.items.item 
                : [data.resposta.items.item];

            console.log(`Found ${results.length} results`);
            results.slice(0, 3).forEach((r, i) => {
                console.log(`  [${i+1}] ${r.titol || r.title || 'N/A'}`);
            });

            // Trobem el millor match comparant títols
            const normalizedTitle = item.name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .trim();

            console.log(`Normalized title: "${normalizedTitle}"`);

            const bestMatch = results.find(result => {
                const resultTitle = (result.titol || result.title || '').toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .trim();
                
                // Match exacte o que conté el títol
                const matches = resultTitle === normalizedTitle || 
                       resultTitle.includes(normalizedTitle) ||
                       normalizedTitle.includes(resultTitle);
                
                if (matches) {
                    console.log(`  ✓ MATCH: "${resultTitle}"`);
                }
                
                return matches;
            });

            if (bestMatch && bestMatch.id) {
                console.log(`Using: ${bestMatch.titol || bestMatch.title} (${bestMatch.id})`);
                // Creem un stream amb enllaç a 3Cat
                const threeCatUrl = `https://www.3cat.cat/3cat/directe/${bestMatch.id}`;
                
                streams.push({
                    name: "3Cat",
                    title: "Veure a 3Cat",
                    url: threeCatUrl,
                    externalUrl: threeCatUrl
                });
            } else {
                console.log(`No match found`);
            }
        }
    } catch (error) {
        console.error("Error cercant a 3Cat:", error);
    }

    console.log(`Returning ${streams.length} streams`);
    return Promise.resolve({ 
        streams,
        cacheMaxAge: 3600,           // Cache streams 1h
        staleRevalidate: 1800,       // Servir stale durant 30min mentre es revalida
        staleError: 86400            // Servir stale durant 1 dia si hi ha error
    });
});

module.exports = builder.getInterface();
