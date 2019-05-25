"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({ logFormatter: "simple" });

broker.createService({
	name: "greeter",
	hooks: {
		before: {
			"*"(ctx) {
				broker.logger.info(chalk.cyan("Before all hook"));
			},
			hello(ctx) {
				broker.logger.info(chalk.magenta("  Before hook"));
			}
		},
		after: {
			"*"(ctx, res) {
				broker.logger.info(chalk.cyan("After all hook"));
				return res;
			},
			hello(ctx, res) {
				broker.logger.info(chalk.magenta("  After hook"));
				return res;
			}
		},
	},

	actions: {
		hello: {
			hooks: {
				before(ctx) {
					broker.logger.info(chalk.yellow.bold("    Before action hook"));
				},
				after(ctx, res) {
					broker.logger.info(chalk.yellow.bold("    After action hook"));
					return res;
				}
			},

			handler(ctx) {
				broker.logger.info(chalk.green.bold("      Action handler"));
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.catch(err => broker.logger.error(err))
	.then(() => broker.stop());
