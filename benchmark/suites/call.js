"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Broker call benchmarks").printHeader();

let ServiceBroker = require("../../src/service-broker");

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);

	broker.loadService(__dirname + "/../user.service");

	broker.start();
	return broker;
}

let bench1 = benchmark.createSuite("Call methods");
(function() {
	let broker = createBroker();

	bench1.ref("broker.call (normal)", done => {
		broker.call("users.empty").then(done);
	});

	bench1.add("broker.call (with params)", done => {
		broker.call("users.empty", { id: 5, sort: "name created", limit: 10 }).then(done);
	});

})();

// ----------------------------------------------------------------
let bench2 = benchmark.createSuite("Call with middlewares");

(function() {
	let broker = createBroker();
	bench2.ref("Call without middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => handler(ctx).then(res => res);
	};
	broker.use(mw1);

	bench2.add("Call with 1 middleware", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => handler(ctx).then(res => res);
	};
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("Call with 5 middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench3 = benchmark.createSuite("Call with cachers");

let MemoryCacher = require("../../src/cachers").Memory;

(function() {
	let broker = createBroker();
	bench3.ref("No cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher (keys filter)", done => {
		return broker.call("users.get2", { id: 5 }).then(done);
	});
})();

// ----------------------------------------------------------------
let bench4 = benchmark.createSuite("Call with param validator");

(function() {
	let broker = createBroker();
	bench4.ref("No validator", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator passes", done => {
		return broker.call("users.validate", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator fail", done => {
		return broker.call("users.validate", { id: "a5" })
			.catch(done);
	});
})();

// ----------------------------------------------------------------
let bench5 = benchmark.createSuite("Call with statistics & metrics");

(function() {
	let broker = createBroker();
	bench5.ref("No statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench5.add("With metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ statistics: true });
	bench5.add("With statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true, statistics: true });
	bench5.add("With metrics & statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

benchmark.run([bench1, bench2, bench3, bench4, bench5]);

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