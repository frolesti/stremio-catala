const StreamProvider = require("./base");

class MaxProvider extends StreamProvider {
    constructor() {
        super("max", "Max", "💜", [1899, 384], "https://play.max.com/search?q={query}");
    }
}

module.exports = new MaxProvider();
