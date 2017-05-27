"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: console,
	logLevel: "info"
});

let service1 = {
	name: "service-1",
	actions: {
		hello(ctx) {
			return "Hello World!";
		},
		greeter(ctx) {
			return this.greeting(ctx.params.name);
		}
	}
};

let service2 = {
	name: "service-2",
	methods: {
		greeting(name) {
			return `Hello ${name}`;
		}
	}
};

broker.createService({
	name: "mixed",
	mixins: [
		service1,
		service2
	],
	actions: {
		hello(ctx) {
			return "Hello Mixins!";
		}
	}
});

broker.call("mixed.hello").then(console.log);
broker.call("mixed.greeter", { name: "John" }).then(console.log);
