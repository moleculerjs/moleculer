"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Moleculer common benchmarks").printHeader();

let ServiceBroker = require("../../src/service-broker");

function createBroker(opts = {}) {
	// Create broker
	let broker = new ServiceBroker(Object.assign({ logger: false }, opts));
	broker.loadService(__dirname + "/../user.service");
	broker.loadService(__dirname + "/../math.service");
	broker.start();

	return broker;
}

let bench1 = benchmark.createSuite("Local call");
(function() {
	let broker = createBroker();
	bench1.ref("broker.call (normal)", done => {
		return broker.call("users.empty").then(done);
	});

	bench1.add("broker.call (with params)", done => {
		return broker.call("math.add", { a: 4, b: 2 }).then(done);
	});

})();

// ----------------------------------------------------------------
let bench2 = benchmark.createSuite("Call with middlewares");

(function() {
	let broker = createBroker();
	bench2.ref("No middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let mw1 = handler => {
		return ctx => handler(ctx).then(res => res);
	};

	const broker = createBroker({
		middlewares: Array(5).fill(mw1)
	});

	bench2.add("5 middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench3 = benchmark.createSuite("Call with metrics");

(function() {
	let broker = createBroker();
	bench3.ref("No metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench3.add("With metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench4 = benchmark.createSuite("Remote call with FakeTransporter");

(function() {

	let Transporter = require("../../src/transporters/fake");
	let Serializer = require("../../src/serializers/json");

	let b1 = new ServiceBroker({
		logger: false,
		transporter: new Transporter(),
		requestTimeout: 0,
		serializer: new Serializer(),
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		transporter: new Transporter(),
		requestTimeout: 0,
		serializer: new Serializer(),
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			}
		}
	});

	b1.start().then(() => b2.start());

	let c = 0;
	bench4.ref("Remote call echo.reply", done => {
		return b1.call("echo.reply", { a: c++ }).then(done);
	});

	bench4.add("Remote call echo.reply with tracking", done => {
		b2.options.trackContext = true;
		return b1.call("echo.reply", { a: c++ }, { trackContext: true }).then(done);
	});
})();
// ----------------------------------------------------------------

let bench5 = benchmark.createSuite("Context tracking");
(function() {
	let broker = createBroker( { trackContext: true });
	bench5.ref("broker.call (without tracking)", done => {
		return broker.call("math.add", { a: 4, b: 2 }, { trackContext: false }).then(done);
	});

	bench5.add("broker.call (with tracking)", done => {
		return broker.call("math.add", { a: 4, b: 2 }, { trackContext: true }).then(done);
	});

})();

module.exports = Promise.delay(1000).then(() => benchmark.run([bench1, bench2, bench3, bench4, bench5]));


/*

===============================
  Moleculer common benchmarks
===============================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Local call
√ broker.call (normal)*             1,595,635 rps
√ broker.call (with params)*        1,662,917 rps

   broker.call (normal)* (#)            0%      (1,595,635 rps)   (avg: 626ns)
   broker.call (with params)*       +4.22%      (1,662,917 rps)   (avg: 601ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ No middlewares*        1,621,427 rps
√ 5 middlewares*           664,141 rps

   No middlewares* (#)       0%      (1,621,427 rps)   (avg: 616ns)
   5 middlewares*       -59.04%        (664,141 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Call with metrics
√ No metrics*          1,546,373 rps
√ With metrics*          486,737 rps

   No metrics* (#)         0%      (1,546,373 rps)   (avg: 646ns)
   With metrics*      -68.52%        (486,737 rps)   (avg: 2μs)
-----------------------------------------------------------------------

Suite: Remote call with FakeTransporter
√ Remote call echo.reply*                         42,409 rps
√ Remote call echo.reply with tracking*           45,739 rps

   Remote call echo.reply* (#)                     0%         (42,409 rps)   (avg: 23μs)
   Remote call echo.reply with tracking*       +7.85%         (45,739 rps)   (avg: 21μs)
-----------------------------------------------------------------------

Suite: Context tracking
√ broker.call (without tracking)*        1,606,966 rps
√ broker.call (with tracking)*           1,588,692 rps

   broker.call (without tracking)* (#)       0%      (1,606,966 rps)   (avg: 622ns)
   broker.call (with tracking)*          -1.14%      (1,588,692 rps)   (avg: 629ns)
-----------------------------------------------------------------------

*/
