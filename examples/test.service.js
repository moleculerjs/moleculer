"use strict";

module.exports = {
	name: "test",
	actions: {
		fatal() {
			this.logger.fatal("Fatal error!");
		}
	}
};
