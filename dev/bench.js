/* eslint-disable no-console */

"use strict";

let _ = require("lodash");
let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

let broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	transporter: "NATS"
});

broker.createService({
	name: "test",
	actions: {
		hello: {
			handler(ctx) {
				if (_.random(100) > 90)
					return this.Promise.reject(new MoleculerError("Random error!", 510));

				return "Hello Moleculer";
				//return this.Promise.delay(100).then(() => "Hello Moleculer");
			}
		}
	}
});

broker.start()
	.then(() => broker.repl());
