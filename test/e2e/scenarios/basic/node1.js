const { createNode } = require("../../utils");

const broker = createNode("node1");
broker.createService({
	name: "echo",

	actions: {
		reply: {
			handler(ctx) {
				return {
					params: ctx.params,
					meta: ctx.meta,
					response: {
						a: "Hey",
						b: 3333,
						c: true,
						d: {
							e: 122.34,
							f: null
						}
					}
				};
			}
		}
	},

	events: {
		"sample.event"(ctx) {
			ctx.broadcast("$scenario.event.emitted", {
				nodeID: this.broker.nodeID,
				event: ctx.eventName,
				params: ctx.params,
				meta: ctx.meta
			});
		}
	}
});

broker.start();
