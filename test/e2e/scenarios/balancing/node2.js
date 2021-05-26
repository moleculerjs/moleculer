const { createNode, logEventEmitting } = require("../../utils");

const broker = createNode("node2");
broker.loadService("./test.service.js");

broker.createService({
	name: "mail",
	events: {
		"user.created"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

broker.start();
