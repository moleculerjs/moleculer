"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Moleculer common benchmarks").printHeader();

let ServiceBroker = require("../../src/service-broker");

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);
	broker.loadService(__dirname + "/../user.service");
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
		return broker.call("users.empty", { id: 5, sort: "name created", limit: 10 }).then(done);
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
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => Promise.resolve().then(() => handler(ctx).then(res => res));
	};
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("5 middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench3 = benchmark.createSuite("Call with statistics & metrics");

(function() {
	let broker = createBroker();
	bench3.ref("No statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench3.add("With metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

/*(function() {
	let broker = createBroker({ statistics: true });
	bench3.add("With statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();*/

(function() {
	let broker = createBroker({ metrics: true, statistics: true });
	bench3.add("With metrics & statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench4 = benchmark.createSuite("Remote call with FakeTransporter");

(function() {

	let Transporter = require("../../src/transporters/fake");
	let Serializer = require("../../src/serializers/json");

	let b1 = new ServiceBroker({
		transporter: new Transporter(),
		requestTimeout: 0,
		serializer: new Serializer(),
		nodeID: "node-1",
		
	});

	let b2 = new ServiceBroker({
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
	bench4.add("Remote call echo.reply", done => {
		return b1.call("echo.reply", { a: c++ }).then(done);
	});
})();

module.exports = benchmark.run([bench1, bench2, bench3, bench4]);


/*

===============================
  Moleculer common benchmarks
===============================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Local call
√ broker.call (normal) x 856,356 ops/sec ±0.33% (86 runs sampled)
√ broker.call (with params) x 816,742 ops/sec ±1.36% (85 runs sampled)

   broker.call (normal)          0.00%    (856,356 ops/sec)
   broker.call (with params)    -4.63%    (816,742 ops/sec)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ No middlewares x 803,110 ops/sec ±1.02% (84 runs sampled)
√ 5 middlewares x 808,488 ops/sec ±1.03% (88 runs sampled)

   No middlewares    -0.67%    (803,110 ops/sec)
   5 middlewares      0.00%    (808,488 ops/sec)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics x 812,022 ops/sec ±0.77% (87 runs sampled)
√ With metrics x 199,014 ops/sec ±1.49% (85 runs sampled)
√ With statistics x 522,074 ops/sec ±1.06% (88 runs sampled)
√ With metrics & statistics x 191,070 ops/sec ±1.45% (77 runs sampled)

   No statistics                 0.00%    (812,022 ops/sec)
   With metrics                -75.49%    (199,014 ops/sec)
   With statistics             -35.71%    (522,074 ops/sec)
   With metrics & statistics   -76.47%    (191,070 ops/sec)
-----------------------------------------------------------------------

Suite: Remote call with FakeTransporter
√ Remote call echo.reply x 45,211 ops/sec ±1.00% (79 runs sampled)

   Remote call echo.reply     0.00%     (45,211 ops/sec)
-----------------------------------------------------------------------

*/