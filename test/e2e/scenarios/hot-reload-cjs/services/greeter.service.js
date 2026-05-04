const GREETING = require("./shared");

module.exports = {
	name: "greeter",

	actions: {
		hello() {
			return GREETING;
		}
	}
};
