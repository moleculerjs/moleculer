"use strict";

module.exports = {
	name: "test",
	actions: {
		fatal(ctx) {
			this.logger.fatal("Fatal error!");
		}
	}
};
