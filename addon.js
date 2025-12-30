const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
    "id": "org.stremio.catala",
    "version": "1.0.0",
    "name": "Stremio en Català",
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
        },
        {
            "type": "series",
            "id": "catalan_series",
            "name": "Sèries en Català"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Carreguem el catàleg del fitxer JSON
const catalog = require("./catalog.json");

builder.defineCatalogHandler(({type, id, extra}) => {
    console.log("request for catalog: "+type+" "+id);
    
    if (type === "movie" && id === "catalan_movies") {
        // Retornem només les pel·lícules del catàleg
        const movies = catalog.filter(item => item.type === "movie");
        return Promise.resolve({ metas: movies });
    } else if (type === "series" && id === "catalan_series") {
        // Retornem només les sèries del catàleg
        const series = catalog.filter(item => item.type === "series");
        return Promise.resolve({ metas: series });
    } else {
        return Promise.resolve({ metas: [] });
    }
});

module.exports = builder.getInterface();
