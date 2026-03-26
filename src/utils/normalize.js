/**
 * Utilitats de normalització de text.
 * Permeten cerques accent-insensitive i generació de slugs.
 */

/**
 * Normalitza un text eliminant accents i diacrítics.
 * "Merlí" → "merli", "Polseres vermelles" → "polseres vermelles"
 */
function removeAccents(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/l·l/gi, 'll');
}

/**
 * Normalitza un text per a comparació (minúscules, sense accents).
 */
function normalizeForSearch(text) {
    return removeAccents(text).toLowerCase();
}

/**
 * Genera un slug compatible amb URLs a partir d'un títol.
 * "La casa nostra" → "la-casa-nostra"
 * "Merlí" → "merli"
 */
function generateSlug(title) {
    return removeAccents(title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

module.exports = { removeAccents, normalizeForSearch, generateSlug };
