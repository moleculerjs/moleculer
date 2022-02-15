"use strict";

const ServiceBroker = require("../src/service-broker");

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS"
});

broker1.createService({
	name: "svc-a",
	actions: {
		async doThing(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			const res = await ctx.call("svc-b.doThing", "", {
				headers: {
					a: "aa"
				}
			});
			// this.logger.info("Response headers:", ctx.responseHeaders);
			// ctx.responseHeaders.fromA = "from-a";
			return res;
		}
	},
	events: {
		"event-w"(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			return ctx.emit("event-x", "", {
				headers: {
					w: "ww"
				}
			});
		}
	}
});

broker1.createService({
	name: "svc-b",
	actions: {
		async doThing(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			const headers = {
				b: "bb"
			};
			const res = await ctx.call("svc-c.doThing", "", { headers });
			//ctx.responseHeaders.fromB = "from-b";
			return res;
		}
	},
	events: {
		"event-x"(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			return ctx.emit("event-y", "", {
				headers: {
					x: "xx"
				}
			});
		}
	}
});

// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS"
});

broker2.createService({
	name: "svc-c",
	actions: {
		async doThing(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			const res = await ctx.call("svc-d.doThing", "", {
				headers: {
					c: "cc"
				}
			});
			//ctx.responseHeaders.fromC = "from-c";
			return res;
		}
	},
	events: {
		"event-y"(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			return ctx.emit("event-z", "", {
				headers: {
					y: "yy"
				}
			});
		}
	}
});

broker2.createService({
	name: "svc-d",
	actions: {
		async doThing(ctx) {
			this.logger.info("Received headers:", ctx.headers);
			//ctx.responseHeaders.fromD = "from-d";
		}
	},
	events: {
		"event-z"(ctx) {
			this.logger.info("Received headers:", ctx.headers);
		}
	}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.then(() => broker1.repl())
	.delay(1000)
	.then(() => {
		broker1.logger.info("-------------------------");
		return broker1.call("svc-a.doThing", "data", {
			headers: {
				from: "repl"
			}
		});
	})
	.delay(1000)
	.then(() => {
		broker1.logger.info("-------------------------");
		return broker1.emit("event-w", "data", {
			headers: {
				from: "repl"
			}
		});
	});
