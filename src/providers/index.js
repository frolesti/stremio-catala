/**
 * Registre de proveïdors de streaming.
 * 
 * Per afegir una nova plataforma:
 * 1. Crea el fitxer a src/providers/ (seguint el patró de base.js)
 * 2. Afegeix-lo aquí amb require()
 * 
 * L'ordre determina l'ordre en què apareixen els streams a Stremio.
 */
const providers = [
    require("./threeCat"),      // 3Cat (TV3/CCMA) - prioritat per contingut català
    require("./filmin"),        // FilminCAT
    require("./netflix"),       // Netflix
    require("./prime"),         // Amazon Prime Video
    require("./disney"),        // Disney+
    require("./max"),           // Max (HBO)
    require("./movistar"),      // Movistar+
    require("./skyshowtime"),   // SkyShowtime
    require("./torrentio"),      // Torrentio (torrents reproduïbles)
];

module.exports = providers;
