"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Moleculer common benchmarks");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");
let userService;

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);
	broker.loadService(__dirname + "/../user.service");
	broker.start();

	return broker;
}

let bench1 = new Benchmarkify({ async: true, name: "Local call"});
(function() {
	let broker = createBroker();
	bench1.add("broker.call (normal)", () => {
		return broker.call("users.empty");
	});

	bench1.add("broker.call (with params)", () => {
		return broker.call("users.empty", { id: 5, sort: "name created", limit: 10 });
	});

})();

// ----------------------------------------------------------------
let bench2 = new Benchmarkify({ async: true, name: "Call with middlewares"});

(function() {
	let broker = createBroker();
	bench2.add("No middlewares", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => Promise.resolve().then(() => handler(ctx).then(res => res));
	};
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("5 middlewares", () => {
		return broker.call("users.empty");
	});
})();

// ----------------------------------------------------------------
let bench3 = new Benchmarkify({ async: true, name: "Call with cachers"});

let MemoryCacher = require("../../src/cachers").Memory;

(function() {
	let broker = createBroker();
	bench3.add("No cacher", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher (keys filter)", () => {
		return broker.call("users.get2", { id: 5 });
	});
})();

// ----------------------------------------------------------------
let bench4 = new Benchmarkify({ async: true, name: "Call with param validator"});

(function() {
	let broker = createBroker();
	bench4.add("No validator", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator passes", () => {
		return broker.call("users.validate", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator fail", () => {
		return broker.call("users.validate", { id: "a5" })
			.catch(err => null);
	});
})();

// ----------------------------------------------------------------
let bench5 = new Benchmarkify({ async: true, name: "Call with statistics & metrics"});

(function() {
	let broker = createBroker();
	bench5.add("No statistics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench5.add("With metrics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ statistics: true });
	bench5.add("With statistics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ metrics: true, statistics: true });
	bench5.add("With metrics & statistics", () => {
		return broker.call("users.empty");
	});
})();

// ----------------------------------------------------------------
let bench6 = new Benchmarkify({ async: true, name: "Remote call with FakeTransporter"});

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
	bench6.add("Remote call echo.reply", () => {
		return b1.call("echo.reply", { a: c++ });
	});
})();

bench1.run()
.then(() => bench2.skip())
.then(() => bench3.skip())
.then(() => bench4.skip())
.then(() => bench5.skip())
.then(() => bench6.run());


/*

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ broker.call (normal) x 818,115 ops/sec ±0.38% (87 runs sampled)
√ broker.call (with params) x 790,488 ops/sec ±1.35% (86 runs sampled)

   broker.call (normal)          0.00%    (818,115 ops/sec)
   broker.call (with params)    -3.38%    (790,488 ops/sec)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares x 762,770 ops/sec ±1.03% (87 runs sampled)
√ Call with 1 middleware x 769,515 ops/sec ±0.73% (88 runs sampled)
√ Call with 5 middlewares x 769,607 ops/sec ±0.96% (87 runs sampled)

   Call without middlewares    -0.88%    (762,770 ops/sec)
   Call with 1 middleware       0.00%    (769,515 ops/sec)
   Call with 5 middlewares      0.01%    (769,607 ops/sec)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher x 598,163 ops/sec ±0.86% (85 runs sampled)
√ Built-in cacher x 64,271 ops/sec ±0.99% (84 runs sampled)
√ Built-in cacher (keys filter) x 88,719 ops/sec ±0.93% (86 runs sampled)

   No cacher                         0.00%    (598,163 ops/sec)
   Built-in cacher                 -89.26%     (64,271 ops/sec)
   Built-in cacher (keys filter)   -85.17%     (88,719 ops/sec)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator x 588,463 ops/sec ±1.11% (84 runs sampled)
√ With validator passes x 541,903 ops/sec ±1.41% (84 runs sampled)
√ With validator fail x 25,648 ops/sec ±1.62% (85 runs sampled)

   No validator              0.00%    (588,463 ops/sec)
   With validator passes    -7.91%    (541,903 ops/sec)
   With validator fail     -95.64%     (25,648 ops/sec)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics x 735,371 ops/sec ±1.16% (88 runs sampled)
√ With metrics x 180,635 ops/sec ±1.49% (82 runs sampled)
√ With statistics x 493,453 ops/sec ±1.06% (86 runs sampled)
√ With metrics & statistics x 178,360 ops/sec ±0.96% (85 runs sampled)

   No statistics                 0.00%    (735,371 ops/sec)
   With metrics                -75.44%    (180,635 ops/sec)
   With statistics             -32.90%    (493,453 ops/sec)
   With metrics & statistics   -75.75%    (178,360 ops/sec)
-----------------------------------------------------------------------

*/