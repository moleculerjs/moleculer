const ServiceBroker = require("../src/service-broker");
const { Strategies } = require("../index");

const { random } = require("lodash");

// Create custom strategy
class CustomStrategy extends Strategies.Base {
	select(list, ctx) {
		console.log("====> CUSTOM <=====");
		return list[random(0, list.length - 1)];
	}
}

// Register custom strategy
Strategies.register("Custom", CustomStrategy);

function createBroker(nodeID, strategy, svcSchema) {
	const broker = new ServiceBroker({
		nodeID: nodeID,
		transporter: "NATS",

		registry: {
			strategy: strategy
		}
	});

	broker.createService(svcSchema);

	return broker;
}

const schema1 = {
	name: "test",
	actions: {
		first(ctx) {
			return `[${this.broker.nodeID}] Expected to use: RoundRobin, it works!`;
		},
		second: {
			strategy: "RoundRobin",
			handler() {
				return `[${this.broker.nodeID}] Expected to use: CustomStrategy, still RoundRobin in use..`;
			}
		}
	}
};

const schema2 = {
	name: "custom",
	actions: {
		first(ctx) {
			return `[${this.broker.nodeID}] "Expected to use: RoundRobin, it works!"`;
		},
		second: {
			// Set custom strategy for this action
			strategy: "Custom",
			handler() {
				return `[${this.broker.nodeID}] Expected to use: CustomStrategy, it works!`;
			}
		}
	}
};

const brokerRoundRobinBase1 = createBroker("roundRobin1", "RoundRobin", schema1);

const brokerCustomBase1 = createBroker("brokerCustomBase1", CustomStrategy, schema2);
const brokerCustomBase2 = createBroker("brokerCustomBase2", CustomStrategy, schema2);

Promise.all([
	brokerRoundRobinBase1.start(),
	brokerCustomBase1.start(),
	brokerCustomBase2.start()
]).then(async () => {
	brokerRoundRobinBase1.repl();

	console.log("Waiting for other brokers...");
	await brokerRoundRobinBase1.Promise.delay(1500);
	console.log("Waiting done...");
});
