"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Middleware benchmark").printHeader();

let ServiceBroker = require("../../src/service-broker");

let bench = benchmark.createSuite("Middleware test");

(function() {
	let broker = new ServiceBroker({ logger: false });
	broker.loadService(__dirname + "/../user.service");

	bench.ref("Without middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	let broker = new ServiceBroker({ logger: false });

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
	let broker = new ServiceBroker({ logger: false });
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
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Middleware test
√ Without middlewares*        1,725,594 rps
√ With 1 middlewares*         1,395,079 rps
√ With 10 middlewares*        1,841,953 rps

   Without middlewares* (#)       0%      (1,725,594 rps)   (avg: 579ns)
   With 1 middlewares*       -19.15%      (1,395,079 rps)   (avg: 716ns)
   With 10 middlewares*       +6.74%      (1,841,953 rps)   (avg: 542ns)
-----------------------------------------------------------------------


*/
