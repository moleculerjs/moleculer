const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	validator: {
		type: "Fastest",
		options: {
			useNewCustomCheckerFunction: true,
			messages: {
				invalidOwner: "Invalid user ID in '{field}'!"
			}
		}
	},
	tracing: {
		enabled: true,
		exporter: "Console"
	}
});

broker.createService({
	name: "users",
	actions: {
		isValid: {
			params: {
				id: "number"
			},
			async handler(ctx) {
				return !!(ctx.params.id % 2);
			}
		}
	}
});

broker.createService({
	name: "posts",
	actions: {
		create: {
			params: {
				$$async: true,
				title: "string",
				owner: { type: "number", custom: async (value, errors, schema, name, parent, context) => {
					const ctx = context.meta;

					const res = await ctx.call("users.isValid", { id: value });
					if (res !== true)
						errors.push({ type: "invalidOwner", actual: value });
					return value;
				} },
			},
			handler(ctx) {
				return `Post created for owner '${ctx.params.owner}'`;
			}
		}
	}
});

broker.start()
	.then(() => broker.repl())
	.then(() => broker.call("posts.create", { title: "Post #1", owner: 2 }))
	.then(res => broker.logger.info("Result:", res))
	.catch(err => broker.logger.error(err));
