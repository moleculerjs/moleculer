"use strict";

let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let { CustomError } = require("../../src/errors");
let NatsTransporter = require("../../src/transporters/mqtt");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: new NatsTransporter(),
	logger: console
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			if (_.random(100) > 90)
				return this.Promise.reject(new CustomError("Internal error!", 510));
				
			return Number(ctx.params.a) + Number(ctx.params.b);
		},
	}
});

broker.start();