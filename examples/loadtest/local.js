/* eslint-disable no-console */

"use strict";

let random = require("lodash/random");
let os = require("os");
let hostname = os.hostname();

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || hostname + "-server",
	logger: null,
	transporter: null
	//metrics: true
});

broker.createService({
	name: "math",
	actions: {
		add: {
			handler(ctx) {
				return Number(ctx.params.a) + Number(ctx.params.b);
			}
		}
	}
});

let payload = { a: random(0, 100), b: random(0, 100) };

let count = 0;

function work() {
	broker
		.call("math.add", payload)
		.then(res => {
			if ((count++ % 10) * 1000) {
				// Fast cycle
				work();
			} else {
				// Slow cycle
				setImmediate(() => work());
			}
			return res;
		})
		.catch(err => {
			throw err;
		});
}

broker.start().then(() => {
	count = 0;

	setTimeout(() => {
		let startTime = Date.now();
		work();

		setInterval(() => {
			if (count > 0) {
				let rps = count / ((Date.now() - startTime) / 1000);
				console.log(Number(rps.toFixed(0)).toLocaleString(), "req/s");
				count = 0;
				startTime = Date.now();
			}
		}, 1000);
	}, 1000);
});
