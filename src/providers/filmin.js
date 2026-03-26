const StreamProvider = require("./base");

/**
 * FilminCAT - versió catalana de Filmin.
 * Sobreescriu _getDeepLink per canviar filmin.es -> filmin.cat
 */
class FilminProvider extends StreamProvider {
    constructor() {
        super("filmin", "FilminCAT", "🎬", [63], "https://www.filmin.cat/cerca?q={query}");
    }

    _getDeepLink(jwOffers) {
        const url = super._getDeepLink(jwOffers);
        // JustWatch retorna URLs de filmin.es; les convertim a filmin.cat
        if (url) return url.replace('filmin.es', 'filmin.cat');
        return null;
    }
}

module.exports = new FilminProvider();
