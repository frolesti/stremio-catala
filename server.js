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
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: #111 url('https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80') no-repeat center center fixed; 
                    background-size: cover;
                    color: #fff; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    position: relative;
                }
                body::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: -1;
                }
                h1 { color: #fff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .logo { width: 120px; margin-bottom: 20px; }
                .btn { background: #8a5aab; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; display: inline-block; transition: background 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                .btn:hover { background: #9b6bc0; }
                code { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; display: block; margin-top: 10px; word-break: break-all; border: 1px solid rgba(255,255,255,0.2); }
            </style>
        </head>
        <body>
            <img src="https://stremio.com/website/stremio-logo-small.png" alt="Stremio Logo" class="logo">
            <h1>Stremio Català</h1>
            <p>Catàleg de pel·lícules i sèries en català.</p>
            
            <a href="${stremioUrl}" class="btn">Instal·lar a Stremio</a>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #aaa;">
                Si el botó no funciona, copia aquest enllaç a la barra de cerca de Stremio:<br>
                <code>${manifestUrl}</code>
            </p>
            <p style="margin-top: 10px; font-size: 0.7em; color: #888;">v1.3</p>
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
