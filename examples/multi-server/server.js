"use strict";

let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let { MoleculerError } = require("../../src/errors");

// Create broker
let broker = new ServiceBroker({
	namespace: "multi",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: "NATS",
	//serializer: "ProtoBuf",

	logger: console
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			broker.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.callerNodeID})`);
			if (_.random(100) > 90)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return {
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			};
		},
	}
});

broker.start()
	.then(() => broker.repl());
