// Carreguem variables d'entorn (.env) per a TMDB_READ_TOKEN
require('dotenv').config();

const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Obtenim la versió del manifest
const manifest = addonInterface.manifest;

// Llegim la plantilla HTML una sola vegada a l'inici
const landingTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

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
