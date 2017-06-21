"use strict";

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({ logger: console });

// Load service
broker.loadService(__dirname + "/../math.service.js");

// Call actions
broker.call("math.add", { a: 5, b: 3 }).then(res => broker.logger.info("  5 + 3 =", res))
	.then(() => {
		return broker.call("math.sub", { a: 9, b: 2 }).then(res => broker.logger.info("  9 - 2 =", res));
	})
	.then(() => {
		return broker.call("math.mult", { a: 3, b: 4 }).then(res => broker.logger.info("  3 * 4 =", res));
	})
	.then(() => {
		return broker.call("math.div", { a: 8, b: 4 }).then(res => broker.logger.info("  8 / 4 =", res));
	})
	.then(() => {
		// Divide by zero!
		return broker.call("math.div", { a: 5, b: 0 }).then(res => broker.logger.info("  5 / 0 =", res));
	})
	.catch(err => {
		broker.logger.error(`Error occured! Action: '${err.ctx.action.name}', Message: ${err.code} - ${err.message}`);
		if (err.data)
			broker.logger.error("Error data:", err.data);
	});

//broker.repl();