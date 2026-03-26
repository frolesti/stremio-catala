const StreamProvider = require("./base");

class MovistarProvider extends StreamProvider {
    constructor() {
        super("movistar", "Movistar+", "🟢", [149, 339], "https://ver.movistarplus.es/buscar/?text={query}");
    }
}

module.exports = new MovistarProvider();
