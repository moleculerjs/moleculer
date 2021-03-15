"use strict";

/**
 * Testing the new AsyncLocalStorage module
 * to store the current context in the action into the async local storage.
 *
 * Please note it works only >= Node 14.
 */

const  ServiceBroker = require("../src/service-broker");
const { AsyncLocalStorage } = require("async_hooks");

const asyncLocalStorage = new AsyncLocalStorage();

const AsyncLocalStorageMiddleware = {
	localAction(handler) {
		return (ctx) => asyncLocalStorage.run(ctx, () => handler(ctx));
	},
};

// Create broker
const broker = new ServiceBroker({
	middlewares: [AsyncLocalStorageMiddleware]
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			async handler(ctx) {
				await this.doSomething();
				return `Hello ${ctx.params.name}`;
			}
		}
	},
	methods: {
		async doSomething() {
			await Promise.resolve().delay(500);
			const ctx = asyncLocalStorage.getStore();
			console.log("Current context params:", ctx ? ctx.params : "<No context>");
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(res => broker.logger.info("Result:", res))
	.catch(err => broker.logger.error(err))
	.then(() => broker.stop());
