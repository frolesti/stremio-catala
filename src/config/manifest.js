/**
 * Manifest de l'addon Stremio en Català.
 * Defineix la identitat, recursos i catàlegs de l'addon.
 */
const manifest = {
    id: "org.stremio.catala",
    version: "2.0.0",
    name: "Stremio en Català",
    description: "Catàleg de pel·lícules i sèries en català amb enllaços a plataformes d'streaming (3Cat, Filmin, Netflix, Prime Video, Disney+, Max, Movistar+...).",
    logo: "https://stremio-en-catala.vercel.app/logo.svg",
    resources: [
        "catalog",
        {
            name: "stream",
            types: ["movie", "series"],
            idPrefixes: ["tt"]
        }
    ],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "catalan_movies",
            name: "Pel·lícules en Català",
            extra: [
                { name: "search", isRequired: false },
                { name: "skip", isRequired: false },
                { name: "sort", options: ["Més recents", "Popularitat", "Més antigues"], isRequired: false }
            ]
        },
        {
            type: "series",
            id: "catalan_series",
            name: "Sèries en Català",
            extra: [
                { name: "search", isRequired: false },
                { name: "skip", isRequired: false },
                { name: "sort", options: ["Més recents", "Popularitat", "Més antigues"], isRequired: false }
            ]
        }
    ]
};

module.exports = manifest;
