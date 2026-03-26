/**
 * Handler de streams.
 * Orquestra tots els proveïdors per generar enllaços de streaming.
 * 
 * Flux:
 * 1. Extraure IMDB ID base (sense temporada/episodi)
 * 2. Obtenir títol (catàleg local → Cinemeta fallback)
 * 3. Consultar TMDB watch/providers per saber plataformes disponibles
 * 4. Executar tots els proveïdors en paral·lel
 * 5. Retornar streams combinats
 */
const { generateSlug } = require("../utils/normalize");
const cinemeta = require("../services/cinemeta");
const { getWatchProviders } = require("../services/tmdb");
const providers = require("../providers");

// Catàleg local per resolució ràpida de títols
const catalog = require("../../catalog.json");

/**
 * Extraure l'IMDB ID base sense temporada/episodi.
 * "tt1234567:1:3" → "tt1234567"
 */
function getBaseImdbId(id) {
    return id.split(':')[0];
}

/**
 * Handler principal de streams.
 */
async function streamHandler({ type, id }) {
    console.log(`[Stream] ${type}/${id}`);

    // 1. Extreure IMDB ID base
    const baseImdbId = getBaseImdbId(id);

    // 2. Obtenir títol
    let title = null;
    const catalogItem = catalog.find(meta => meta.id === baseImdbId);
    
    if (catalogItem) {
        title = catalogItem.name;
        console.log(`[Stream]   Catalog: "${title}"`);
    } else {
        title = await cinemeta.getTitle(type, baseImdbId);
        if (title) {
            console.log(`[Stream]   Cinemeta: "${title}"`);
        } else {
            console.log(`[Stream]   Not found: ${baseImdbId}`);
            return { streams: [] };
        }
    }

    // 3. Obtenir proveïdors de TMDB (en paral·lel si cal)
    const tmdbProviders = await getWatchProviders(baseImdbId, type);
    if (tmdbProviders) {
        const allProviders = [
            ...(tmdbProviders.flatrate || []),
            ...(tmdbProviders.free || []),
            ...(tmdbProviders.ads || [])
        ];
        console.log(`[Stream]   TMDB providers: ${allProviders.map(p => p.provider_name).join(', ') || 'none'}`);
    }

    // 4. Context per als proveïdors
    const slug = generateSlug(title);
    const context = { title, imdbId: baseImdbId, fullId: id, type, slug, tmdbProviders };

    // 5. Executar tots els proveïdors en paral·lel
    const results = await Promise.allSettled(
        providers.map(provider => provider.getStreams(context))
    );

    // 6. Combinar streams (respectant l'ordre dels proveïdors)
    const streams = [];
    results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            streams.push(...result.value);
        } else if (result.status === 'rejected') {
            console.error(`[Stream] Error in ${providers[i].id}:`, result.reason.message);
        }
    });

    // 7. Si no hem trobat cap plataforma específica, oferir cerca genèrica
    if (streams.length === 0) {
        const encodedName = encodeURIComponent(title);
        streams.push({
            name: "3Cat",
            title: `🔍 Cercar "${title}" a 3Cat`,
            externalUrl: `https://www.3cat.cat/3cat/cercador/?text=${encodedName}`
        });
        streams.push({
            name: "FilminCAT",
            title: `🔍 Cercar "${title}" a FilminCAT`,
            externalUrl: `https://www.filmin.cat/cerca?q=${encodedName}`
        });
    }

    console.log(`[Stream]   → ${streams.length} streams for "${title}"`);
    return {
        streams,
        cacheMaxAge: 3600,
        staleRevalidate: 1800,
        staleError: 86400
    };
}

module.exports = streamHandler;
