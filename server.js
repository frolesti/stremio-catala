// Carreguem variables d'entorn (.env) per a TMDB_READ_TOKEN
require('dotenv').config();

// Importem getRouter directament per evitar carregar serveHTTP/Express dues vegades
const getRouter = require("stremio-addon-sdk/src/getRouter");
const addonInterface = require("./addon");
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Obtenim la versió del manifest
const manifest = addonInterface.manifest;

// Llegim la plantilla HTML una sola vegada a l'inici
const landingTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// Middleware per afegir s-maxage a les respostes amb Cache-Control.
// L'SDK de Stremio posa max-age però NO s-maxage, que és el que
// Vercel necessita per cachear respostes a la CDN edge.
// Sense això, cada petició desperta el serverless function (cold start)
// i Stremio pot fer timeout → "Failed to fetch".
//
// s-maxage=604800 (7 dies): el catàleg és estàtic, no canvia sense redeploy.
// Quan es fa deploy, Vercel invalida el cache automàticament.
app.use((req, res, next) => {
    const _setHeader = res.setHeader;
    res.setHeader = function(name, value) {
        if (name.toLowerCase() === 'cache-control' && typeof value === 'string' && !value.includes('s-maxage')) {
            value += ', s-maxage=604800';
        }
        return _setHeader.call(this, name, value);
    };
    next();
});

// Health/keepalive endpoint per serveis de monitoratge (UptimeRobot, etc.)
// Mantenir la funció "calenta" evita cold starts que fan que Stremio no trobi resultats.
app.get('/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.json({ status: 'ok', version: manifest.version });
});

// Servim el logo estàticament
app.get('/logo.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.svg'));
});

// Servim l'addon utilitzant el middleware de l'SDK
// Això gestiona automàticament les rutes /manifest.json, /catalog/..., etc.
const addonMiddleware = getRouter(addonInterface);
app.use('/', addonMiddleware);

// Pàgina d'inici personalitzada per evitar problemes amb HTTPS/HTTP
app.get('/', (req, res) => {
    const host = req.headers.host;
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const manifestUrl = `${protocol}://${host}/manifest.json`;
    const stremioUrl = `stremio://${host}/manifest.json`;

    const html = landingTemplate
        .replace(/\{\{MANIFEST_URL\}\}/g, manifestUrl)
        .replace(/\{\{STREMIO_URL\}\}/g, stremioUrl)
        .replace(/\{\{VERSION\}\}/g, manifest.version);

    res.send(html);
});

const port = process.env.PORT || 7000;

// Exportem l'app per a Vercel (serverless)
module.exports = app;

// Només arrenquem el servidor si executem el fitxer directament (localment)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Addon actiu a http://127.0.0.1:${port}/`);
    });
}
