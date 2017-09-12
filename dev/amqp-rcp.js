/* eslint-disable no-console */

"use strict";

let chalk = require("chalk");
let _ = require("lodash");
let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

// --- NODE 1 ---

// Create broker
let server1 = new ServiceBroker({
	nodeID: "server-1",
	transporter: "amqp://192.168.51.29:5672",
	logger: console
});

server1.createService({
	name: "test",
	actions: {
		work(ctx) {
			this.logger.info(chalk.grey(`Received: ${ctx.params.counter}`, `(from: ${ctx.callerNodeID})`));

			if (_.random(100) > 70)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return ctx.params.counter;
		},
	},

	/*events: {
		"echo.event"(data, sender) {
			this.logger.info(`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
	},*/

	started() {
		/*let reqCount = 0;

		setInterval(() => {
			let p = this.broker.call("test.work", { counter: ++reqCount });
			p.then(res => {
				this.logger.info(`${reqCount} = ${res}`, `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				this.logger.warn(chalk.red.bold(`${reqCount} = ERROR! ${err.message}`));
			});
		}, 1000);*/
	}
});

// --- NODE 2 ---

// Create broker
let client1 = new ServiceBroker({
	nodeID: "client-1",
	transporter: "amqp://192.168.51.29:5672",
	logger: console,
	requestRetry: 3,
});

client1.createService({
	name: "caller",
	started() {
		let reqCount = 0;

		setInterval(() => {
			let p = this.broker.call("test.work", { counter: ++reqCount });
			p.then(res => {
				this.logger.info(`${reqCount} = ${res}`, `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				this.logger.warn(chalk.red.bold(`${reqCount} = ERROR! ${err.message}`));
			});
		}, 1000);
	}
});

// --- START ---

Promise.all([
	server1.start(),
	client1.start()
]).catch(err => server1.logger.error(err));
