const StreamProvider = require("./base");

class NetflixProvider extends StreamProvider {
    constructor() {
        super("netflix", "Netflix", "🔴", [8, 1796], "https://www.netflix.com/search?q={query}");
    }
}

module.exports = new NetflixProvider();
