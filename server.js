const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const express = require('express');
const app = express();

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
    
    res.send(`
        <!DOCTYPE html>
        <html lang="ca">
        <head>
            <meta charset="UTF-8">
            <title>Stremio Català</title>
            <style>
                body { font-family: sans-serif; background: #111; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                h1 { color: #a376cb; }
                .btn { background: #8a5aab; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; display: inline-block; }
                .btn:hover { background: #9b6bc0; }
                code { background: #333; padding: 5px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Stremio_logo.png/240px-Stremio_logo.png" alt="Stremio Logo" width="100">
            <h1>Stremio Català</h1>
            <p>Catàleg de pel·lícules i sèries en català.</p>
            
            <a href="${stremioUrl}" class="btn">Instal·lar a Stremio</a>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #aaa;">
                Si el botó no funciona, copia aquest enllaç a la barra de cerca de Stremio:<br>
                <code>${manifestUrl}</code>
            </p>
            <p style="margin-top: 10px; font-size: 0.7em; color: #555;">v1.1</p>
        </body>
        </html>
    `);
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
