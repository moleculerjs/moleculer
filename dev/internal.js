"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	internalServices: {
		$node: {
			actions: {
				hello(ctx) {
					return `Hello ${ctx.params.name || "Anonymous"}!`;
				},
				options: false
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
