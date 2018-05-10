"use strict";

module.exports = {
	name: "test",
	metadata: {
		scalable: true,
		priority: 5
	},

	actions: {
		hello2() {
			return "Hello Moleculer!!!";
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
