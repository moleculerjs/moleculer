"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logLevel: "debug",
	cacher: {
		type: "MemoryLRU",
		options: {
			max: 100,
			ttl: 3
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			//cache: false,
			cache: {
				//enabled: true
				enabled: ctx => ctx.params.noCache !== true
			},
			handler(ctx) {
				this.logger.debug(chalk.yellow("Execute handler"));
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer", noCache: true }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }, { meta: { $cache: false }}))

	.then(() => {
		for(let i = 0; i < 1000; i++) {
			broker.cacher.set(`key-${i}`, i);
			if (i % 10 == 0) {
				broker.cacher.get(`key-${100}`);
				broker.cacher.get(`key-${200}`);
				broker.cacher.get(`key-${500}`);
				broker.cacher.get(`key-${400}`);
				broker.cacher.get(`key-${300}`);
			}
		}

		broker.logger.info("Length:", broker.cacher.cache.length);
		broker.logger.info("keys:", broker.cacher.cache.keys().join(","));
	})

	.delay(5 * 1000)
	.then(() => {
		broker.logger.info("=========================================");
		broker.logger.info("Length:", broker.cacher.cache.length);
		broker.logger.info("keys:", broker.cacher.cache.keys().join(","));
	})

	.catch(err => broker.logger.error(err))
	.then(() => broker.stop());
