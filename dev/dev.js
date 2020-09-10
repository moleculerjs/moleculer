const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	validator: {
		type: "Fastest",
		options: {
			messages: {
				required: "Missing field!"
			}
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		welcome: {
			/*params: {
				name: "string"
			},*/
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	},

	merged(schema) {
		this.broker.logger.info("Service merged. I can modify the schema before service registration.");
		schema.actions.welcome.params = { name: "string" };
	},

	created() {
		this.logger.info("Service created.");
	},

	started() {
		this.logger.info("Service started.");
	},

	stopped() {
		this.logger.info("Service stopped.");
	}
});

broker.start()
	.then(() => broker.repl())
	.then(() => broker.call("greeter.welcome", { name: "Icebob" }))
	.then(res => broker.logger.info("Result:", res))
	.catch(err => broker.logger.error(err));
