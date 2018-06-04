"use strict";

import * as path from "path";
import { ServiceBroker } from "../../../";

const broker = new ServiceBroker({
	logger: true
});

broker.loadService(path.join(__dirname, "greeter.service.ts"));

(async function() {
	await broker.start();

	const res = await broker.call("greeter.welcome", { name: "Typescript"});
	broker.logger.info("");
	broker.logger.info("Result: ", res);
	broker.logger.info("");

	await broker.stop();
})();
