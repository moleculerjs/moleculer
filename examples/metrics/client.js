"use strict";

const _ = require("lodash");
const chalk = require("chalk");
const ServiceBroker = require("../../src/service-broker");

const SERVICES = ["add", "sub", "mult", "div"];
const randomService = () => SERVICES[_.random(SERVICES.length - 1)];

// Create broker
const broker = new ServiceBroker(_.defaultsDeep({
	//nodeID: "client-" + process.pid,
}, require("./moleculer.config.js")));

let count = 0;

broker.start()
	.then(() => broker.repl())
	.then(() => broker.waitForServices(SERVICES))
	.then(() => {
		const time = broker.options.nodeSettings.client.reqInterval;
		setInterval(() => {
			count++;
			const payload = { a: _.random(1, 100), b: _.random(1, 100) };
			const svc = randomService() + ".calc";
			const msg = `${count}. Call '${svc}' with ${payload.a} + ${payload.b} = `;
			const p = broker.call(svc, payload, { requestID: `${broker.nodeID}-${count}` });
			p.then(({ res }) => {
				broker.logger.info(_.padEnd(msg + Number(res).toFixed(0), 40), chalk.green.bold("OK")/*, chalk.grey(`(${p.ctx.duration} ms)`)*/);
			}).catch(err => {
				broker.logger.info(_.padEnd(msg, 40), chalk.red.bold(`ERROR! ${err.message}`));
				//if (err.type != "RANDOM_ERROR")
				//	broker.logger.error(err);
			});

		}, time / 2 + (Math.random() * time / 2));

	});
