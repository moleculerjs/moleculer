"use strict";

let kleur = require("kleur");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker();

const mixin = {
	hooks: {
		before: {
			"*"(ctx) {
				broker.logger.info(kleur.cyan("Before all hook (MIXIN)"));
			},
			hello(ctx) {
				broker.logger.info(kleur.magenta("  Before hook (MIXIN)"));
			}
		},
		after: {
			"*"(ctx, res) {
				broker.logger.info(kleur.cyan("After all hook (MIXIN)"));
				return res;
			},
			hello(ctx, res) {
				broker.logger.info(kleur.magenta("  After hook (MIXIN)"));
				return res;
			}
		}
	},

	actions: {
		hello: {
			hooks: {
				before(ctx) {
					broker.logger.info(kleur.yellow().bold("    Before action hook (MIXIN)"));
				},
				after(ctx, res) {
					broker.logger.info(kleur.yellow().bold("    After action hook (MIXIN)"));
					return res;
				}
			}
		}
	}
};

broker.createService({
	name: "greeter",
	mixins: [mixin],
	hooks: {
		before: {
			"*"(ctx) {
				broker.logger.info(kleur.cyan("Before all hook"));
			},
			hello(ctx) {
				broker.logger.info(kleur.magenta("  Before hook"));
			}
		},
		after: {
			"*"(ctx, res) {
				broker.logger.info(kleur.cyan("After all hook"));
				return res;
			},
			hello(ctx, res) {
				broker.logger.info(kleur.magenta("  After hook"));
				return res;
			}
		}
	},

	actions: {
		hello: {
			hooks: {
				before(ctx) {
					broker.logger.info(kleur.yellow().bold("    Before action hook"));
				},
				after(ctx, res) {
					broker.logger.info(kleur.yellow().bold("    After action hook"));
					return res;
				}
			},

			handler(ctx) {
				broker.logger.info(kleur.green().bold("      Action handler"));
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker
	.start()
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.catch(err => broker.logger.error(err))
	.then(() => broker.stop());
