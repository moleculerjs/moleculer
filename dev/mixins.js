/* eslint-disable no-console */

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
	},

	created() {
		//this.logger.info("Created from service-1");
	},

	started() {
		return Promise.resolve().then(() => this.logger.info("Started from service-1"));
	},

	stopped() {
		this.logger.info("Stopped from service-1");
	}
};

let service2 = {
	name: "service-2",
	methods: {
		greeting(name) {
			return `Hello ${name}`;
		}
	},
	created() {
		//this.logger.info("Created from service-2");
	},

	started() {
		this.logger.info("Started from service-2A");
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.logger.info("Started from service-2B");
				//resolve();
				reject(new Error("Cannot start service-2!"));
			}, 500);
		});
	},

	stopped() {
		this.logger.info("Stopped from service-2");
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
	},

	/*created() {
		this.logger.info("Created from mixed");
	}*/

	started() {
		this.logger.info("Started from mixed");
	},

	stopped() {
		this.logger.info("Stopped from mixed");
		//throw new Error("Can't stop mixed!");
	}

});

broker.createService({
	name: "normal",

	created() {
		this.logger.info("Normal created!");
	},

	started() {
		this.logger.info("Normal started!");
	},

	stopped() {
		this.logger.info("Normal stopped");
		//throw new Error("Can't stop normal!");
	}
});

broker.start().then(() => {
	broker.logger.info("Started!");
}).timeout(1000).then(() => broker.stop())
	.then(() => broker.logger.info("Stopped!"))
	.catch(err => broker.logger.error("Can't start broker!", err));

//broker.call("mixed.hello").then(console.log);
//broker.call("mixed.greeter", { name: "John" }).then(console.log);
