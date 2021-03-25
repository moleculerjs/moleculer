const { createNode, logEventEmitting } = require("../../utils");

const broker = createNode("node3");
broker.loadService("./test.service.js");

broker.createService({
	name: "payment",
	events: {
		"user.created"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

broker.start();
