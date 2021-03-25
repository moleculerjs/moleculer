const { createNode, logEventEmitting } = require("../../utils");

const broker = createNode("node1");
broker.loadService("./test.service.js");

broker.createService({
	name: "users",
	events: {
		"user.created"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

broker.createService({
	name: "payment",
	events: {
		"user.created"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

broker.start();
