/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let Cacher = require("../src/cachers/memory");
let Transporters = require("../src/transporters");
let Serializer = require("../src/serializers/json");

function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		serializer: new Serializer(),
		nodeID: "node-1",

	});

	let b2 = new ServiceBroker({
		transporter: new Transporter(opts),
		//cacher: new Cacher(),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		serializer: new Serializer(),
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			},
			get: {
				cache: {
					keys: ["id"]
				},
				handler() {
					return {
						name: "User"
					};
				}
			}
		}
	});

	let b3 = new ServiceBroker({
		transporter: new Transporter(opts),
		//cacher: new Cacher(),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		serializer: new Serializer(),
		nodeID: "node-3"
	});

	b3.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			},
			get: {
				cache: {
					keys: ["id"]
				},
				handler() {
					return {
						name: "User"
					};
				}
			}
		}
	});

	return Promise.all([
		b1.start(),
		b2.start(),
		b3.start(),
	]).then(() => [b1, b2, b3]);
}

createBrokers(Transporters.Fake).then(([b1]) => {

	let count = 0;
	function doRequest() {
		count++;
		return b1.call("echo.reply", { a: count }).then(res => {
		//return b2.call("echo.get", { id: 5 }).then(res => {
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
			console.log("RPS:", rps.toLocaleString("hu-HU", {maximumFractionDigits: 0}), "req/s");
			count = 0;
			startTime = Date.now();
		}, 1000);

		b1.waitForServices(["echo"]).then(() => doRequest());

	}, 1000);

});
