const StreamProvider = require("./base");

class DisneyProvider extends StreamProvider {
    constructor() {
        super("disney", "Disney+", "🏰", [337], "https://www.disneyplus.com/search/{query}");
    }
}

module.exports = new DisneyProvider();
