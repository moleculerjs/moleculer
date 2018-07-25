"use strict";

const Promise	= require("bluebird");
const _ = require("lodash");

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Middleware benchmark").printHeader();

const ServiceBroker = require("../../src/service-broker");

const bench = benchmark.createSuite("Middleware test");

(function() {
	const broker = new ServiceBroker({ logger: false, internalMiddlewares: false });
	broker.loadService(__dirname + "/../user.service");
	broker.start();

	bench.add("Without internal & custom middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

(function() {
	const broker = new ServiceBroker({ logger: false });
	broker.loadService(__dirname + "/../user.service");
	broker.start();

	bench.ref("Without custom middlewares", done => {
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
	broker.start();

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
	broker.start();

	bench.add("With 10 middlewares", done => {
		return broker.call("users.find").then(done);
	});
})();

Promise.delay(1000).then(() => bench.run());

/*

========================
  Middleware benchmark
========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Middleware test
√ Without internal & custom middlewares*        2,786,666 rps
√ Without custom middlewares*                   1,745,153 rps
√ With 1 middlewares*                           1,270,108 rps
√ With 10 middlewares*                            473,433 rps

   Without internal & custom middlewares*      +59.68%      (2,786,666 rps)   (avg: 358ns)
   Without custom middlewares* (#)                  0%      (1,745,153 rps)   (avg: 573ns)
   With 1 middlewares*                         -27.22%      (1,270,108 rps)   (avg: 787ns)
   With 10 middlewares*                        -72.87%        (473,433 rps)   (avg: 2μs)
-----------------------------------------------------------------------


*/
