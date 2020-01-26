"use strict";

import * as path from "path";
import { ServiceBroker } from "../../../";

const broker = new ServiceBroker({
	logger: true,
	metrics: {
		enabled: true,
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
	}
});

broker.loadService(path.join(__dirname, "greeter.service.ts"));

(async function() {
	try {
		await broker.start();

		const res = await broker.call("greeter.welcome", { name: "Typescript"});
		broker.logger.info("");
		broker.logger.info("Result: ", res);
		broker.logger.info("");
		if (res != "Welcome, TYPESCRIPT!")
			throw new Error("Result is mismatch!");
		else
			await broker.stop();

	} catch(err) {
		console.log(err);
		process.exit(1);
	}
})();
