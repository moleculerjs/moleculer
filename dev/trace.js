/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");
let _ = require("lodash");

let broker1 = new ServiceBroker({
	nodeID: "node1",
	logger: true,
	logLevel: "info",
	transporter: "NATS",
	metrics: true
});

broker1.createService({
	name: "service1",
	actions: {
		first(ctx) {
			//return "Hello from first!";
			return ctx.call("service2.second").delay(10);
		}
	}
});

broker1.loadService("./examples/metrics.zipkin.service");

// ----------------------------------------------------------------------

let broker2 = new ServiceBroker({
	nodeID: "node2",
	logger: true,
	logLevel: "info",
	transporter: "NATS",
	metrics: true
});

broker2.createService({
	name: "service2",
	actions: {

		second(ctx) {
			//return "Hello from second!";
			return this.Promise.all([
				ctx.call("service2.third"),
				ctx.call("service2.third"),
				ctx.call("service2.third"),
				ctx.call("service2.third")
			]);
		},

		third(ctx) {
			if (_.random(100) > 80)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return this.Promise.delay(_.random(25, 75)).then(() => "Hello from third!");
		}
	}
});

// ----------------------------------------------------------------------

broker1.Promise.resolve()
	.then(() => broker1.start())
	.then(() => broker2.start())
	.catch(err => broker1.logger.error(err))
	.delay(1000)
	.then(() => broker1.call("service1.first"))
	.then(() => broker1.repl());
