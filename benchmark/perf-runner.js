/* eslint-disable no-console */

"use strict";

const fs = require("fs");

const ServiceBroker = require("../src/service-broker");
const Transporters = require("../src/transporters");
const Middlewares = require("../src/middlewares");

const someData = JSON.parse(fs.readFileSync("./benchmark/data/10k.json", "utf8"));

function createBrokers(Transporter, opts) {
	const b1 = new ServiceBroker({
		nodeID: "node-1",
		transporter: new Transporter(opts),
		middlewares: [
			//Middlewares.Transmit.Encryption("moleculer"),
			//Middlewares.Transmit.Compression(),
		]
	});

	const b2 = new ServiceBroker({
		nodeID: "node-2",
		transporter: new Transporter(opts),
		middlewares: [
			//Middlewares.Transmit.Encryption("moleculer"),
			//Middlewares.Transmit.Compression(),
		],
		//tracing: true
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			},
			big(ctx) {
				return someData;
			}
		}
	});

	return Promise.all([
		b1.start(),
		b2.start(),
	]).then(() => [b1, b2]);
}

createBrokers(Transporters.Fake).then(([b1, b2]) => {

	let count = 0;
	function doRequest() {
		count++;
		return b1.call("echo.reply", { a: count }).then(res => {
			if (count % 10000) {
				// Fast cycle
				doRequest();
			} else {
				// Slow cycle
				setImmediate(() => doRequest());
			}
			return res;

		}).catch(err => {
			throw err;
		});
	}

	setTimeout(() => {
		let startTime = Date.now();

		setInterval(() => {
			let rps = count / ((Date.now() - startTime) / 1000);
			console.log("RPS:", rps.toLocaleString("hu-HU", { maximumFractionDigits: 0 }), "req/s");
			count = 0;
			startTime = Date.now();
		}, 1000);

		b1.waitForServices(["echo"]).then(() => doRequest());

	}, 1000);

});
