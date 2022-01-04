"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	nodeID: "wildcard-hooks"
});

broker.createService({
	name: "hook",

	hooks: {
		before: {
			// Applies to all actions that start with "create-"
			"create-*"(ctx) {
				broker.logger.info("HOOK: create-*");
			},

			// Applies to all actions that end with "-user"
			"*-user": [
				ctx => {
					broker.logger.info("HOOK: *-user");
				}
			],

			"*-create": [
				ctx => {
					broker.logger.info("HOOK: *-create");
				}
			],

			"*-create-*": [
				ctx => {
					broker.logger.info("HOOK: *-create-*");
				}
			],

			generate: [
				ctx => {
					broker.logger.info("HOOK: generate");
				}
			]
		}
	},

	actions: {
		"create-account": {
			handler() {
				broker.logger.info("ACTION: create-account");
			}
		},
		"update-user": {
			handler() {
				broker.logger.info("ACTION: update-user");
			}
		},
		"table-create": {
			handler() {
				broker.logger.info("ACTION: table-create");
			}
		},
		"test-create-test": {
			handler() {
				broker.logger.info("ACTION: test-create-test");
			}
		},
		generate: {
			handler() {
				broker.logger.info("ACTION: generate");
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
