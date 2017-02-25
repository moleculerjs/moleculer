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

/*

========================
  Middleware benchmark
========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Middleware test
√ Without middlewares x 519,015 ops/sec ±0.46% (85 runs sampled)
√ With 1 middlewares x 493,663 ops/sec ±0.32% (88 runs sampled)
√ With 10 middlewares x 518,211 ops/sec ±0.34% (89 runs sampled)

   Without middlewares     0.00%    (519,015 ops/sec)
   With 1 middlewares     -4.88%    (493,663 ops/sec)
   With 10 middlewares    -0.15%    (518,211 ops/sec)
-----------------------------------------------------------------------


*/