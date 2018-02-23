"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker #1
let broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	logger: console,
	logFormatter: "simple"
});

broker1.createService({
	name: "test",
	dependencies: ["auth"],
	actions: {
		async hello(ctx) {
			this.logger.info("Meta before", ctx.meta);
			await ctx.call("auth.login");
			this.logger.info("Meta after", ctx.meta);
			return `Hello ${ctx.meta.user ? ctx.meta.user.name : 'Anonymous'}`
		}
	}
});

broker1.start().then(() => {
	const p = broker1.call("test.hello", {}, { meta: { token: "123456" }})
	p.then(res => broker1.logger.info(res));
});
