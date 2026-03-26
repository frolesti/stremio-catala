const StreamProvider = require("./base");

class SkyShowtimeProvider extends StreamProvider {
    constructor() {
        super("skyshowtime", "SkyShowtime", "🌤️", [1773], "https://www.skyshowtime.com/search?query={query}");
    }
}

module.exports = new SkyShowtimeProvider();
