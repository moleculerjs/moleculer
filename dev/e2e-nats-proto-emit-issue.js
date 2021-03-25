const ServiceBroker = require("../src/service-broker");
const _ = require("lodash");

const broker1 = new ServiceBroker({
	nodeID: "node1",
	transporter: "NATS",
	serializer: "ProtoBuf",
	disableBalancer: true,
	registry: {
		preferLocal: false
	}
});

const broker2 = new ServiceBroker({
	nodeID: "node2",
	transporter: "NATS",
	serializer: "ProtoBuf",
	disableBalancer: true,
	registry: {
		preferLocal: false
	}
});

const broker3 = new ServiceBroker({
	nodeID: "node3",
	transporter: "NATS",
	serializer: "ProtoBuf",
	disableBalancer: true,
	registry: {
		preferLocal: false
	}
});

broker1.createService({
	name: "users",
	events: {
		"user.created"(ctx) {
			this.logger.info("Event received", ctx.params);
		},
	},
});

broker2.createService({
	name: "payment",
	events: {
		"user.created"(ctx) {
			this.logger.info("Event received", ctx.params);
		},
	},
});

broker3.createService({
	name: "mail",
	events: {
		"user.created"(ctx) {
			this.logger.info("Event received", ctx.params);
		},
	},
});

Promise.all([broker1.start(), broker2.start(), broker3.start()])
	.then(() => broker1.repl())
	.then(() => {
		setInterval(() => {
			broker1.emit("user.created", {
				id: 1,
				name: "John Doe"
			});
		}, 1000);
	})
	.catch((err) => broker1.logger.error(err));
