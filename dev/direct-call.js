const ServiceBroker = require("../src/service-broker");

const svc = {
	name: "greeter",
	actions: {
		welcome: {
			handler(ctx) {
				return `Hello on ${this.broker.nodeID}`;
			}
		}
	}
};

const broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	registry: { strategy: "RoundRobin", preferLocal: true }
});
const broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	registry: { strategy: "RoundRobin", preferLocal: true }
});

broker1.createService(svc);
broker2.createService(svc);

Promise.all([broker1.start(), broker2.start()])
	.delay(2000)
	.then(async () => {
		broker1
			.call("greeter.welcome", {}, { nodeID: "node-2" })
			.then(res => broker1.logger.info("Result:", res));
		broker1
			.call("greeter.welcome", {}, { nodeID: "node-2" })
			.then(res => broker1.logger.info("Result:", res));
		broker1
			.call("greeter.welcome", {}, { nodeID: "node-2" })
			.then(res => broker1.logger.info("Result:", res));
	});
