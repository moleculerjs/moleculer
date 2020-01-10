"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({});

const FooMixin = {
	hooks: {
		before: {
			"*": ["method1"]
		},
		after: {
			"*": ["method2"]
		}
	},

	methods: {
		method1(ctx) {
			this.logger.info("METHOD1");
		},
		method2(ctx, res) {
			this.logger.info("METHOD2");
			return res;
		},
	}
};

broker.createService({
	name: "foo",
	mixins: [FooMixin],

	async started() {
		await this.actions.baz();
	},

	actions: {
		baz(ctx) {
			this.logger.info("BAZZZZ!");
		}
	},
});

broker.start().then(async () => {

	//await broker.call("foo.baz");

	broker.repl();
});