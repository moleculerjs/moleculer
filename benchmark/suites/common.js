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
	let mw1 = {
		localAction: handler => ctx => handler(ctx).then(res => res)
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
let bench4 = benchmark.createSuite("Call with tracing");

(function() {
	let broker = createBroker();
	bench4.ref("No tracing", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ tracing: true });
	bench4.add("With tracing", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench5 = benchmark.createSuite("Remote call with FakeTransporter");

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
		nodeID: "node-2",
		trackContext: true
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
	bench5.ref("Remote call echo.reply", done => {
		return b1.call("echo.reply", { a: c++ }).then(done);
	});

	bench5.add("Remote call echo.reply with tracking", done => {
		return b1.call("echo.reply", { a: c++ }).then(done);
	});
})();
// ----------------------------------------------------------------

let bench6 = benchmark.createSuite("Context tracking");
(function() {
	let broker = createBroker( { trackContext: true });
	bench6.ref("broker.call (without tracking)", done => {
		return broker.call("math.add", { a: 4, b: 2 }, { trackContext: false }).then(done);
	});

	bench6.add("broker.call (with tracking)", done => {
		return broker.call("math.add", { a: 4, b: 2 }, { trackContext: true }).then(done);
	});

})();

module.exports = Promise.delay(1000).then(() => benchmark.run([bench1, bench2, bench3, bench4, bench5, bench6]));


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
√ broker.call (normal)*             1,705,852 rps
√ broker.call (with params)*        1,736,929 rps

   broker.call (normal)* (#)            0%      (1,705,852 rps)   (avg: 586ns)
   broker.call (with params)*       +1.82%      (1,736,929 rps)   (avg: 575ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ No middlewares*        1,675,912 rps
√ 5 middlewares*           710,133 rps

   No middlewares* (#)       0%      (1,675,912 rps)   (avg: 596ns)
   5 middlewares*       -57.63%        (710,133 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Call with metrics
√ No metrics*          1,615,240 rps
√ With metrics*          504,892 rps

   No metrics* (#)         0%      (1,615,240 rps)   (avg: 619ns)
   With metrics*      -68.74%        (504,892 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Remote call with FakeTransporter
√ Remote call echo.reply*                         42,118 rps
√ Remote call echo.reply with tracking*           44,081 rps

   Remote call echo.reply* (#)                     0%         (42,118 rps)   (avg: 23μs)
   Remote call echo.reply with tracking*       +4.66%         (44,081 rps)   (avg: 22μs)
-----------------------------------------------------------------------

Suite: Context tracking
√ broker.call (without tracking)*        1,680,786 rps
√ broker.call (with tracking)*           1,673,843 rps

   broker.call (without tracking)* (#)       0%      (1,680,786 rps)   (avg: 594ns)
   broker.call (with tracking)*          -0.41%      (1,673,843 rps)   (avg: 597ns)
-----------------------------------------------------------------------

*/
