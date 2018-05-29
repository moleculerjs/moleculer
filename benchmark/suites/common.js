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
	bench5.ref("broker.call (normal)", done => {
		return broker.call("math.add", { a: 4, b: 2 }, { trackContext: false }).then(done);
	});

	bench5.add("broker.call (with trackContext)", done => {
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
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Local call
√ broker.call (normal)*             1,654,091 rps
√ broker.call (with params)*        1,846,689 rps

   broker.call (normal)* (#)            0%      (1,654,091 rps)   (avg: 604ns)
   broker.call (with params)*      +11.64%      (1,846,689 rps)   (avg: 541ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ No middlewares*        1,660,456 rps
√ 5 middlewares*         1,588,124 rps

   No middlewares* (#)       0%      (1,660,456 rps)   (avg: 602ns)
   5 middlewares*        -4.36%      (1,588,124 rps)   (avg: 629ns)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics*                    1,616,265 rps
√ With metrics*                       549,124 rps
√ With statistics*                    768,617 rps
√ With metrics & statistics*          408,013 rps

   No statistics* (#)                   0%      (1,616,265 rps)   (avg: 618ns)
   With metrics*                   -66.03%        (549,124 rps)   (avg: 1μs)
   With statistics*                -52.44%        (768,617 rps)   (avg: 1μs)
   With metrics & statistics*      -74.76%        (408,013 rps)   (avg: 2μs)
-----------------------------------------------------------------------

Suite: Remote call with FakeTransporter
√ Remote call echo.reply*           45,987 rps

   Remote call echo.reply*           0%         (45,987 rps)   (avg: 21μs)
-----------------------------------------------------------------------

*/
