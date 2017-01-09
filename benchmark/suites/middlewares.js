"use strict";

let _ = require("lodash");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Middleware benchmark");

let ServiceBroker = require("../../src/service-broker");

let bench = new Benchmarker({ async: true, name: "Middleware test"});

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	bench.add("Without middlewares", () => {
		return broker.call("users.find");
	});
})();

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	// Add middlewares
	broker.use((ctx, next) => next().then(res => res));

	bench.add("With 1 middlewares", () => {
		return broker.call("users.find");
	});
})();

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	// Add 10 middlewares
	_.times(10, () => {
		broker.use((ctx, next) => next().then(res => res));
	});

	bench.add("With 10 middlewares", () => {
		return broker.call("users.find");
	});
})();

bench.run();
