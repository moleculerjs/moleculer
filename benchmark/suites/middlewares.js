"use strict";

const _ = require("lodash");

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Middleware benchmark").printHeader();

const ServiceBroker = require("../../src/service-broker");

const bench = benchmark.createSuite("Middleware test");

(function() {
	const broker = new ServiceBroker({ logger: false });
	broker.loadService(__dirname + "/../user.service");

	bench.ref("Without middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	// Add middlewares
	const broker = new ServiceBroker({ logger: false, middlewares: [
		handler => {
			return ctx => handler(ctx).then(res => res);
		}
	] });

	broker.loadService(__dirname + "/../user.service");

	bench.add("With 1 middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	const mw = handler => {
		return ctx => handler(ctx).then(res => res);
	};

	// Add 10 middlewares
	const broker = new ServiceBroker({ logger: false, middlewares: Array(10).fill(mw) });
	broker.loadService(__dirname + "/../user.service");

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
