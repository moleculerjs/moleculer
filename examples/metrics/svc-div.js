"use strict";

const _ = require("lodash");
const ServiceBroker = require("../../src/service-broker");

const SVC_NAME = "div";

// Create broker
const broker = new ServiceBroker(_.defaultsDeep({
	nodeID: `svc-${SVC_NAME}-${process.pid}`,
}, require("./moleculer.config.js")));

broker.createService({
	name: SVC_NAME,
	mixins: [require("./mixin")],
	settings: broker.options.nodeSettings.service,
	methods: {
		logic(ctx) {
			return Number(ctx.params.a) / Number(ctx.params.b);
		}
	}
});

broker.start()
	.then(() => broker.repl());
