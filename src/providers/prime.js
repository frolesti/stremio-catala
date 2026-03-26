const StreamProvider = require("./base");

class PrimeProvider extends StreamProvider {
    constructor() {
        super("prime", "Prime Video", "📦", [119, 2100, 10], "https://www.primevideo.com/search?phrase={query}");
    }
}

module.exports = new PrimeProvider();
