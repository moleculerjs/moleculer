"use strict";

let kleur = require("kleur");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logLevel: "debug",
	cacher: {
		type: "Memory",
		options: {
			max: 100,
			ttl: 3,
			missingResponse: Symbol("MISSING")
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
				this.logger.debug(kleur.yellow("Execute handler"));
				return null; //`Hello ${ctx.params.name}`;
			}
		}
	}
});

(async () => {
	await broker.start();

	try {
		broker.logger.info("---------------------", "(direct access)");
		broker.logger.info("Value:", await broker.cacher.get('greeter.hello:name|"Moleculer"'));
		broker.logger.info("---------------------", "(get, set)");
		broker.logger.info("Res:", await broker.call("greeter.hello", { name: "Moleculer" }));
		broker.logger.info("---------------------", "(found)");
		broker.logger.info("Res:", await broker.call("greeter.hello", { name: "Moleculer" }));
		broker.logger.info("---------------------", "(noCache)");
		broker.logger.info(
			"Res:",
			await broker.call("greeter.hello", { name: "Moleculer", noCache: true })
		);
		broker.logger.info("---------------------", "(found)");
		broker.logger.info("Res:", await broker.call("greeter.hello", { name: "Moleculer" }));
		broker.logger.info("---------------------", "($cache: false)");
		broker.logger.info(
			"Res:",
			await broker.call("greeter.hello", { name: "Moleculer" }, { meta: { $cache: false } })
		);
		broker.logger.info("---------------------", "(direct access)");
		broker.logger.info("Value:", await broker.cacher.get('greeter.hello:name|"Moleculer"'));

		/*for (let i = 0; i < 1000; i++) {
		broker.cacher.set(`key-${i}`, i);
		if (i % 10 == 0) {
			broker.cacher.get(`key-${100}`);
			broker.cacher.get(`key-${200}`);
			broker.cacher.get(`key-${500}`);
			broker.cacher.get(`key-${400}`);
			broker.cacher.get(`key-${300}`);
		}
	}*/

		broker.logger.info("---------------------", "Cache entries:");
		const keys = await broker.cacher.getCacheKeys();
		broker.logger.info("Length:", keys.length);
		broker.logger.info("keys:", keys);

		await broker.Promise.delay(35 * 1000);

		broker.logger.info("---------------------", "Cache entries:");
		const keys2 = await broker.cacher.getCacheKeys();
		broker.logger.info("Length:", keys2.length);
		broker.logger.info("keys:", keys2);
	} catch (err) {
		broker.logger.error(err);
	}
	await broker.stop();
})();
