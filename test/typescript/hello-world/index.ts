"use strict";

import * as path from "path";
import { ServiceBroker, Service } from "../../../";

const broker = new ServiceBroker({
	logger: {
		type: "Console",
		options: {
			formatter: "short"
		}
	},
	cacher: {
		type: "Memory",
		options: {
			ttl: 5
		}
	},
	metrics: {
		enabled: true,
		reporter: {
			type: "Event",
			options: {
				broadcast: true
			}
		}
	},
	tracing: {
		enabled: true,
		exporter: [
			{
				type: "Console",
				options: {
					colors: true
				}
			}
		]
	},
	middlewares: [
		{
			localAction(this: Service, next, action) {
				return ctx => {
					this.logger.info("Local action middleware", action.name);
					return next(ctx);
				};
			},
		}
	]
});

broker.loadService(path.join(__dirname, "greeter.service.ts"));
broker.loadService(path.join(__dirname, "posts.service.ts"));

(async function() {
	try {
		await broker.start();

		await broker.call("v2.posts.list", { limit: 10, sort: "title" });
		await broker.call("greeter.hello");
		const res = await broker.call("greeter.welcome", { name: "Typescript" });
		broker.logger.info(`Result: ${res}`);
		if (res != "Welcome, TYPESCRIPT")
			throw new Error("Result is mismatch!");
		else
			await broker.stop();

	} catch(err) {
		console.log(err);
		process.exit(1);
	}
})();
