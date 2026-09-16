const tell = require("./chain/C");

module.exports = {
	name: "chained",

	actions: {
		say() {
			return tell();
		}
	}
};
