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
				broker.logger.info("BEFORE HOOK: create-*");
			},

			// Applies to all actions that end with "-user"
			"*-user": [
				ctx => {
					broker.logger.info("BEFORE HOOK: *-user");
				}
			],

			"*-create": [
				ctx => {
					broker.logger.info("BEFORE HOOK: *-create");
				}
			],

			"*-create-*": [
				ctx => {
					broker.logger.info("BEFORE HOOK: *-create-*");
				}
			],

			generate: [
				ctx => {
					broker.logger.info("BEFORE HOOK: generate");
				}
			]
		},
		after: {
			// Applies to all actions that start with "create-"
			"create-*"(ctx) {
				broker.logger.info("AFTER HOOK: create-*");
			},

			// Applies to all actions that end with "-user"
			"*-user": [
				ctx => {
					broker.logger.info("AFTER HOOK: *-user");
				}
			],

			"*-create": [
				ctx => {
					broker.logger.info("AFTER HOOK: *-create");
				}
			],

			"*-create-*": [
				ctx => {
					broker.logger.info("AFTER HOOK: *-create-*");
				}
			],

			generate: [
				ctx => {
					broker.logger.info("AFTER HOOK: generate");
				}
			]
		},
		error: {
			"*"(ctx, err) {
				broker.logger.info("GLOBAL ERROR HOOK: *");
				throw err;
			},
			// Applies to all actions that start with "create-"
			"create-*"(ctx, err) {
				broker.logger.info("ERROR HOOK: create-*");
			},

			// Applies to all actions that end with "-user"
			"*-user": [
				(ctx, err) => {
					broker.logger.info("ERROR HOOK: *-user");
				}
			],

			"*-create": [
				(ctx, err) => {
					broker.logger.info("ERROR HOOK: *-create");
				}
			],

			"*-create-*": [
				(ctx, err) => {
					broker.logger.info("ERROR HOOK: *-create-*");
				}
			],

			generate: [
				(ctx, err) => {
					broker.logger.info("ERROR HOOK: generate");
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
