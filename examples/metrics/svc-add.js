"use strict";

const _ = require("lodash");
const ServiceBroker = require("../../src/service-broker");

const SVC_NAME = "add";

// Create broker
const broker = new ServiceBroker(_.defaultsDeep({
	//nodeID: `svc-${SVC_NAME}-${process.pid}`,
}, require("./moleculer.config.js")));

const settings = broker.options.nodeSettings.service;


broker.createService({
	name: SVC_NAME,
	mixins: [require("./mixin")],

	settings,

	methods: {
		logic(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		}
	}
});

broker.start()
	.then(() => broker.repl());
