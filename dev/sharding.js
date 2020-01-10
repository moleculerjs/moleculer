const ServiceBroker = require("../src/service-broker");
const _ = require("lodash");

function createBroker(opts) {
	const broker = new ServiceBroker(_.defaultsDeep(opts, {
		transporter: "NATS",
		logLevel: "warn",
		registry: {
			strategy: "RoundRobin"
		},

		middlewares: [
			{
				name: "CallingLogger",
				remoteAction(handler, action) {
					return ctx => {
						this.logger.warn(`===========> Calling ${action.name} on ${ctx.nodeID} ===========>`);
						return handler(ctx);
					};
				}
			}
		]
	}));

	if (broker.nodeID != "main") {
		broker.createService({
			name: "users",
			actions: {
				getAge: {
					strategy: "Shard",
					strategyOptions: {
						shardKey: "name",
						ringSize: 100,
						vnodes: 12
					},
					handler(ctx) {
						//this.logger.warn(`Called '${this.broker.nodeID}' with '${ctx.params.name}'`);
						return 20 + _.random(60);
					}
				}
			}
		});
	}

	return broker;
}

const main = createBroker({ nodeID: "main" });
const broker2 = createBroker({ nodeID: "broker-2" });
const broker1 = createBroker({ nodeID: "broker-1" });
const broker4 = createBroker({ nodeID: "broker-4" });
const broker3 = createBroker({ nodeID: "broker-3" });

async function start() {
	await main.start();
	await broker1.start();
	await broker2.start();
	await broker3.start();
	await broker4.start();

	main.logger.warn("Brokers started.");

	main.repl();

	const usernames = ["john", "bob", "adam", "steve", "mark"];

	setInterval(async () => {
		const name = usernames[_.random(usernames.length - 1)];
		await main.call("users.getAge", { name });
	}, 1000);

}

start();
