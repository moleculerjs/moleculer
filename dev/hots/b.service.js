"use strict";

module.exports = {
	name: "b",

	actions: {
		hello() {
			return "Hello Moleculer!";
		}
	},
	events: {
		"test.event"(c) {
			this.logger.info("Event", c);
		}
	},
	created() {
		this.logger.info(">>> Service created!");
	},

	started() {
		this.logger.info(">>> Service started!");
	},

	stopped() {
		this.logger.info(">>> Service stopped!");
	}
};
