const { createNode, logEventEmitting } = require("../../utils");
const path = require("path");

const broker = createNode("node1");
broker.loadService(path.join(__dirname, "../../services/aes.service.js"));

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
							f: [1, 2, 3],
							g: null
						}
					}
				};
			}
		}
	},

	events: {
		"sample.event"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

broker.start();
