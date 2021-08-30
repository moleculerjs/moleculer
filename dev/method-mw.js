"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const MW = {
	// Wrap local method calls
	localMethod(handler, method) {
		return params => {
			console.log(
				`The '${method.name}' method is called in '${method.service.fullName}' service.`,
				params
			);
			const res = handler(params);
			if (method.uppercase) return res.toUpperCase();

			return res;
		};
	}
};

const broker = new ServiceBroker({
	nodeID: "mw",
	middlewares: [MW]
});

const svc = broker.createService({
	name: "test",
	actions: {
		hello(ctx) {
			return this.hello(ctx.params);
		}
	},
	methods: {
		hello: {
			uppercase: true,
			handler(params) {
				return `Hello ${params.name}`;
			}
		},
		hello2(params) {
			return `Hello2 ${params.name}`;
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() => {
		broker.call("test.hello", { name: "John" }).then(res => broker.logger.info("Res:", res));

		broker.logger.info("Svc", svc.hello({ name: "Jane" }));
	});
