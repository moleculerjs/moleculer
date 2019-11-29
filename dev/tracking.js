"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker #1
let broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	logger: console,
	//logFormatter: "simple",
	tracking: {
		enabled: true
	}
});

let c1 = 0;
broker1.createService({
	name: "first",
	actions: {
		async "5"(ctx) {
			this.logger.info(`${ctx.action.name} begin. ID: ${++c1}`);
			await ctx.call("slow.5");
			this.logger.info(`${ctx.action.name} end.   ID: ${c1}`);
		},

		async "10"(ctx) {
			this.logger.info(`${ctx.action.name} begin. ID: ${++c1}`);
			await ctx.call("slow.10");
			this.logger.info(`${ctx.action.name} end.   ID: ${c1}`);
		}
	}
});

// Create broker #2
let broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	logger: console,
	//logFormatter: "simple",
	tracking: {
		enabled: true
	}
});

let c2 = 0;
broker2.createService({
	name: "slow",
	actions: {
		async "5"(ctx) {
			this.logger.info(`${ctx.action.name} begin. ID: ${++c2}`);
			await this.Promise.delay(5 * 1000);
			this.logger.info(`${ctx.action.name} end.   ID: ${c2}`);
		},

		async "10"(ctx) {
			this.logger.info(`${ctx.action.name} begin. ID: ${++c2}`);
			await this.Promise.delay(10 * 1000);
			this.logger.info(`${ctx.action.name} end.   ID: ${c2}`);
		}
	},

	events: {
		async "slow-5"(ctx) {
			this.logger.info(`${ctx.event.name} begin. ID: ${++c2}`);
			await this.Promise.delay(5 * 1000);
			this.logger.info(`${ctx.event.name} end.   ID: ${c2}`);
		}
	}
});

broker1.Promise.all([
	broker1.start(),
	broker2.start()
]).then(async () => {
	//broker1.repl();

	//broker1.call("first.5");
	//broker1.call("slow.5");
	broker1.emit("slow-5");

	await broker1.Promise.delay(2 * 1000);

	broker1.stop();
	broker2.stop();

});
