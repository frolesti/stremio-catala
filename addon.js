const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
    "id": "org.stremio.catala",
    "version": "1.0.0",
    "name": "Stremio Català",
    "description": "Catàleg de pel·lícules en català.",
    "resources": [
        "catalog"
    ],
    "types": [
        "movie",
        "series"
    ],
    "catalogs": [
        {
            "type": "movie",
            "id": "catalan_movies",
            "name": "Pel·lícules en Català"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Carreguem el catàleg del fitxer JSON
const catalog = require("./catalog.json");

builder.defineCatalogHandler(({type, id, extra}) => {
    console.log("request for catalog: "+type+" "+id);
    
    if (type === "movie" && id === "catalan_movies") {
        // Retornem el contingut del fitxer JSON
        return Promise.resolve({ metas: catalog });
    } else {
        return Promise.resolve({ metas: [] });
    }
});

module.exports = builder.getInterface();
