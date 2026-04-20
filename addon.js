/**
 * Punt d'entrada de l'addon Stremio en Català.
 * 
 * Arquitectura:
 *   addon.js            → Registra handlers amb l'SDK
 *   src/config/          → Manifest i configuració
 *   src/handlers/         → Lògica de catàleg i streams
 *   src/providers/        → Un fitxer per plataforma (fàcil d'escalar)
 *   src/services/         → Cinemeta, TMDB
 *   src/utils/            → Normalització, cache, slugs
 */
// Importem directament els submòduls de l'SDK que necessitem.
// Evitem require("stremio-addon-sdk") perquè carrega serveHTTP → Express,
// afegint ~350ms al cold start de Vercel sense cap benefici.
const addonBuilder = require("stremio-addon-sdk/src/builder");
const manifest = require("./src/config/manifest");
const catalogHandler = require("./src/handlers/catalog");
const metaHandler = require("./src/handlers/meta");
const streamHandler = require("./src/handlers/stream");

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(catalogHandler);
builder.defineMetaHandler(metaHandler);
builder.defineStreamHandler(streamHandler);

module.exports = builder.getInterface();
