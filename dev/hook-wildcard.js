"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	nodeID: "wildcard-hooks"
});

broker.createService({
	name: "hook",

	hooks: {
		before: {
			"*"(ctx) {
				broker.logger.info("GLOBAL BEFORE HOOK");
			},
			// Applies to all actions that start with "create-"
			"create-*"(ctx) {
				broker.logger.info("BEFORE HOOK: create-*");
			},
			"create-account"(ctx) {
				broker.logger.info("BEFORE HOOK: create-account");
			},
			// Applies to all actions that ends with "-account"
			"*-account"(ctx) {
				broker.logger.info("BEFORE HOOK: *-account");
			}
		},
		after: {
			"*"(ctx) {
				broker.logger.info("GLOBAL AFTER HOOK");
			},
			// Applies to all actions that start with "create-"
			"create-*"(ctx) {
				broker.logger.info("AFTER HOOK: create-*");
			},
			"create-account"(ctx) {
				broker.logger.info("AFTER HOOK: create-account");
			},
			// Applies to all actions that ends with "-account"
			"*-account"(ctx) {
				broker.logger.info("AFTER HOOK: *-account");
			}
		},
		error: {
			"*"(ctx, err) {
				broker.logger.info("GLOBAL ERROR HOOK: *");
				throw err;
			},
			// Applies to all actions that start with "create-"
			"create-*"(ctx) {
				broker.logger.info("ERROR HOOK: create-*");
				throw err;
			},
			"create-error"(ctx) {
				broker.logger.info("ERROR HOOK: create-error");
				throw err;
			},
			// Applies to all actions that ends with "-account"
			"*-error"(ctx) {
				broker.logger.info("ERROR HOOK: *-error");
				throw err;
			}
		}
	},

	actions: {
		"create-account": {
			handler() {
				broker.logger.info("ACTION: create-account");
			}
		},
		"create-error": {
			handler() {
				throw new Error("An error occurred!");
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
