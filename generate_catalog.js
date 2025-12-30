require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TOKEN = process.env.TMDB_READ_TOKEN;

if (!TMDB_TOKEN) {
    console.error("Error: TMDB_READ_TOKEN no està definit al fitxer .env");
    process.exit(1);
}

const headers = {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    accept: 'application/json'
};

async function fetchCatalanMovies() {
    try {
        console.log("Buscant pel·lícules en català a TMDB...");
        
        // 1. Busquem pel·lícules amb idioma original català
        // Ordenat per popularitat descendent
        const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
            headers,
            params: {
                with_original_language: 'ca',
                sort_by: 'popularity.desc',
                page: 1
            }
        });

        const results = response.data.results;
        console.log(`S'han trobat ${results.length} pel·lícules.`);

        const catalog = [];

        // 2. Per a cada pel·lícula, necessitem l'ID d'IMDb (ttXXXXXX)
        // Stremio funciona millor amb IDs d'IMDb
        for (const movie of results) {
            try {
                // Obtenim detalls externs per treure l'IMDb ID
                const details = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}/external_ids`, { headers });
                const imdbId = details.data.imdb_id;

                if (imdbId) {
                    catalog.push({
                        id: imdbId,
                        type: "movie",
                        name: movie.title,
                        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                        description: movie.overview,
                        releaseInfo: movie.release_date ? movie.release_date.substring(0, 4) : null,
                        language: "ca"
                    });
                    console.log(`Afegit: ${movie.title} (${imdbId})`);
                } else {
                    console.log(`Saltat (sense IMDb ID): ${movie.title}`);
                }

                // Petita pausa per no saturar l'API (rate limiting)
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (err) {
                console.error(`Error processant ${movie.title}:`, err.message);
            }
        }

        // 3. Guardem el resultat a catalog.json
        const outputPath = path.join(__dirname, 'catalog.json');
        fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 4));
        console.log(`\nCatàleg generat correctament a: ${outputPath}`);
        console.log(`Total pel·lícules: ${catalog.length}`);

    } catch (error) {
        console.error("Error connectant amb TMDB:", error.message);
    }
}

fetchCatalanMovies();
