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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllContent(endpoint, type) {
    let allResults = [];
    let page = 1;
    let totalPages = 1;

    console.log(`\nIniciant cerca de ${type === 'movie' ? 'pel·lícules' : 'sèries'}...`);

    do {
        try {
            const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
                headers,
                params: {
                    language: 'ca-ES',
                    with_original_language: 'ca',
                    sort_by: 'popularity.desc',
                    page: page
                }
            });

            const results = response.data.results;
            totalPages = response.data.total_pages;
            
            console.log(`Processant pàgina ${page} de ${totalPages} (${results.length} elements)...`);

            for (const item of results) {
                try {
                    // Necessitem l'ID d'IMDb
                    const detailsEndpoint = type === 'movie' ? `/movie/${item.id}/external_ids` : `/tv/${item.id}/external_ids`;
                    const details = await axios.get(`${TMDB_BASE_URL}${detailsEndpoint}`, { headers });
                    const imdbId = details.data.imdb_id;

                    if (imdbId) {
                        allResults.push({
                            id: imdbId,
                            type: type,
                            name: item.title || item.name, // Movies use title, TV uses name
                            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                            description: `Títol original: ${item.original_title || item.original_name}\n\n${item.overview || ''}`,
                            releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4),
                            language: "ca"
                        });
                    }
                    // Rate limiting protection
                    await sleep(50); 
                } catch (err) {
                    console.error(`Error processant item ${item.id}:`, err.message);
                }
            }
            
            page++;
            await sleep(200); // Pause between pages

        } catch (error) {
            console.error(`Error a la pàgina ${page}:`, error.message);
            break;
        }
    } while (page <= totalPages);

    return allResults;
}

async function generateCatalog() {
    try {
        const movies = await fetchAllContent('/discover/movie', 'movie');
        const series = await fetchAllContent('/discover/tv', 'series');

        const fullCatalog = [...movies, ...series];

        const outputPath = path.join(__dirname, 'catalog.json');
        fs.writeFileSync(outputPath, JSON.stringify(fullCatalog, null, 4));
        
        console.log(`\nCatàleg generat correctament a: ${outputPath}`);
        console.log(`Total pel·lícules: ${movies.length}`);
        console.log(`Total sèries: ${series.length}`);
        console.log(`Total items: ${fullCatalog.length}`);

    } catch (error) {
        console.error("Error general:", error);
    }
}

generateCatalog();
