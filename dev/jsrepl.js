const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({ logger: true });
broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return "Hello!";
		},
	}
});

broker.start().then(() => require("repl").start("mol $ ").context.broker = broker);


