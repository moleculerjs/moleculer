"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Middleware benchmark").printHeader();

let ServiceBroker = require("../../src/service-broker");

let bench = benchmark.createSuite("Middleware test");

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	bench.ref("Without middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	let broker = new ServiceBroker();

	// Add middlewares
	broker.use(handler => {
		return ctx => handler(ctx).then(res => res);
	});

	broker.loadService(__dirname + "/../user.service");

	bench.add("With 1 middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	let broker = new ServiceBroker();
	broker.loadService(__dirname + "/../user.service");

	// Add 10 middlewares
	_.times(10, () => {
		broker.use(handler => {
			return ctx => handler(ctx).then(res => res);
		});
	});

	bench.add("With 10 middlewares", done => {
		return broker.call("users.find").then(done);
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