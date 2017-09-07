"use strict";

module.exports = {
	name: "test",
	actions: {
		hello() {
			return "Hello Moleculer!!!";
		}
	},
	events: {
		"test.event"(c) {
			this.logger.info("Event", c);
		}
	}
};
