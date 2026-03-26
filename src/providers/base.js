/**
 * Classe base per a tots els proveïdors de streaming.
 * Cada plataforma implementa aquesta interfície.
 * 
 * Per afegir una nova plataforma:
 * 1. Crea un fitxer nou a src/providers/ (ex: nouProvider.js)
 * 2. Extén StreamProvider
 * 3. Implementa getStreams()
 * 4. Registra'l a src/providers/index.js
 */
class StreamProvider {
    /**
     * @param {string} id - Identificador únic del proveïdor
     * @param {string} name - Nom per mostrar a Stremio
     * @param {string} emoji - Emoji per al títol del stream
     */
    constructor(id, name, emoji = "🔗") {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
    }

    /**
     * Retorna els streams disponibles per a un contingut.
     * @param {Object} context - Informació del contingut
     * @param {string} context.title - Títol del contingut
     * @param {string} context.imdbId - ID d'IMDb
     * @param {string} context.type - "movie" o "series"
     * @param {string} context.slug - Slug normalitzat del títol
     * @param {Object|null} context.tmdbProviders - Dades de TMDB watch/providers (ES)
     * @returns {Promise<Array>} Array de Stream objects per a Stremio
     */
    async getStreams(context) {
        throw new Error(`${this.id}: getStreams() not implemented`);
    }
}

module.exports = StreamProvider;
