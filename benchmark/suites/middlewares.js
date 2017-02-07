"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Middleware benchmark");

let ServiceBroker = require("../../src/service-broker");

let bench = new Benchmarkify({ async: true, name: "Middleware test"});

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	bench.add("Without middlewares", () => {
		return broker.call("users.find");
	});
})();

(function() {
	let broker = new ServiceBroker();

	// Add middlewares
	broker.use(handler => {
		return ctx => ctx.after(handler(ctx), res => res);
	});

	broker.loadService(__dirname + "/../user.service");

	bench.add("With 1 middlewares", () => {
		return broker.call("users.find");
	});
})();

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	// Add 10 middlewares
	_.times(10, () => {
		broker.use(handler => {
			return ctx => ctx.after(handler(ctx), res => Promise.resolve(res));
		});
	});

	bench.add("With 10 middlewares", () => {
		return broker.call("users.find");
	});
})();

bench.run();
