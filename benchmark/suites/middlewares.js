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
√ Without middlewares*        1,368,899 rps
√ With 1 middlewares*         1,007,793 rps
√ With 10 middlewares*        1,343,916 rps

   Without middlewares* (#)       0%      (1,368,899 rps)   (avg: 730ns)
   With 1 middlewares*       -26.38%      (1,007,793 rps)   (avg: 992ns)
   With 10 middlewares*       -1.83%      (1,343,916 rps)   (avg: 744ns)
-----------------------------------------------------------------------


*/