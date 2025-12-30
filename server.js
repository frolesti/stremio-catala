const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

serveHTTP(addonInterface, { port: 7000 });

console.log("Addon actiu a http://127.0.0.1:7000/");
