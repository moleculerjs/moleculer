"use strict";

let path = require("path");
let _ = require("lodash");
let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");
let { MoleculerError, MoleculerRetryableError } = require("../src/errors");

// Create broker
let broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: "NATS",
	//serializer: "MsgPack",

	//disableBalancer: true,

	//trackContext: true,

	metrics: true,

	logger: console,
	logLevel: "info",
	logFormatter: "short"
});

broker.createService({
	name: "math",

	hooks: {
		before: {
			// Call it before 'add' handler. You have access to `ctx`
			add(ctx) {
				// `this` is pointed to Service instance
				this.logger.info(chalk.magenta("Before add"), ctx.params);
				if (ctx.params.a > 80)
					throw new MoleculerError("The 'a' value is too big! Value: " + ctx.params.a);
			},

			// Hook for all actions in this service
			"*"(ctx) {
				this.logger.info(chalk.magenta("Before all"), ctx.params);
			},
		},
		after: {
			// Call them after 'add' handerl. You have access to `ctx` and result.
			// Note: You can use multiple hooks
			add: [
				function(ctx, res) {
					// Modify the result
					res.f = 55;
					this.logger.info(chalk.magenta("After add 1"), res);
					// You must return the result
					return res;
				},
				function(ctx, res) {
					res.g = 66;
					this.logger.info(chalk.magenta("After add 2"), res);
					return res;
				},
			],

			// Hook for all actions in this service
			"*"(ctx, res) {
				this.logger.info(chalk.magenta("After all"), res);
				return res;
			},
		},
		error: {
			// Error handler hook.
			add(ctx, err) {
				this.logger.info(chalk.magenta("Error in add"), err.message);
				// Throw further the error
				throw err;
			},

			// Hook for all actions in this service
			"*"(ctx, err) {
				this.logger.info(chalk.magenta("Error in all"), err.message);
				// Throw further the error
				throw err;
			}
		}
	},
	actions: {
		add(ctx) {
			const wait = _.random(500, 1500);
			this.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.nodeID})`);
			if (_.random(100) > 70)
				return this.Promise.reject(new MoleculerRetryableError("Random error!", 510));

			return this.Promise.resolve()./*delay(wait).*/then(() => ({
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			}));
		},
	},

	events: {
		"echo.event"(data, sender) {
			this.logger.info(`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
	},

	started() {
		this.logger.info("Service started.");
	}
});

broker.createService({
	name: "metrics",
	events: {
		"$node.pong"({ nodeID, elapsedTime, timeDiff }) {
			this.logger.info(`PING '${nodeID}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`);
		},
		/*"metrics.circuit-breaker.opened"(payload, sender) {
			this.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.circuit-breaker.closed"(payload, sender) {
			this.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.trace.span.finish"(payload) {
			this.logger.info("Metrics event", payload.action.name, payload.nodeID, Number(payload.duration).toFixed(3) + " ms");
		}*/
	}
});

broker.start()
	.then(() => {
		broker.repl();
		//setInterval(() => broker.sendPing(), 10 * 1000);
		//setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
	});
