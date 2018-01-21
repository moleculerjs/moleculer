/* eslint-disable no-console */

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
	actions: {
		async hello(ctx) {
			this.logger.info("Meta before", ctx.meta);
			await ctx.call("auth.login");
			this.logger.info("Meta after", ctx.meta);
			return `Hello ${ctx.meta.user ? ctx.meta.user.name : 'Anonymous'}`
		}
	}
});

// Create broker #2
let broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	logger: console,
	logFormatter: "simple"
});

broker2.createService({
	name: "auth",
	actions: {
		login(ctx) {
			ctx.meta.user = { name: "John" };
			return true;
		}
	}
});

broker1.Promise.all([
	broker1.start(),
	broker2.start()
]).delay(1000).then(() => {
	broker1.call("test.hello", {}, { meta: { token: "123456" }}).then(res => broker1.logger.info(res));
});
