"use strict";

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Broker call benchmarks").printHeader();

const ServiceBroker = require("../../src/service-broker");

function createBroker(opts) {
	// Create broker
	const broker = new ServiceBroker(Object.assign({ logger: false }, opts));

	broker.loadService(__dirname + "/../user.service");

	broker.start();
	return broker;
}

const bench1 = benchmark.createSuite("Call methods");
(function () {
	const broker = createBroker();

	bench1.ref("broker.call (normal)", done => {
		broker.call("users.empty").then(done);
	});

	bench1.add("broker.call (with params)", done => {
		broker.call("users.empty", { id: 5, sort: "name created", limit: 10 }).then(done);
	});
})();

// ----------------------------------------------------------------
const bench2 = benchmark.createSuite("Call with middlewares");

(function () {
	const broker = createBroker();
	bench2.ref("Call without middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function () {
	const broker = createBroker({ internalMiddlewares: false });
	bench2.ref("Call without internal middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function () {
	const mw1 = {
		localAction: handler => ctx => handler(ctx).then(res => res)
	};

	const broker = createBroker({
		middlewares: [mw1]
	});

	bench2.add("Call with 1 middleware", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function () {
	const mw1 = {
		localAction: handler => ctx => handler(ctx).then(res => res)
	};

	const broker = createBroker({
		middlewares: [mw1, mw1, mw1, mw1, mw1]
	});

	bench2.add("Call with 5 middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
const bench3 = benchmark.createSuite("Call with cachers");

const MemoryCacher = require("../../src/cachers").Memory;

(function () {
	const broker = createBroker();
	bench3.ref("No cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function () {
	const broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function () {
	const broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher (keys filter)", done => {
		return broker.call("users.get2", { id: 5 }).then(done);
	});
})();

// ----------------------------------------------------------------
const bench4 = benchmark.createSuite("Call with param validator");

(function () {
	const broker = createBroker();
	bench4.ref("No validator", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function () {
	const broker = createBroker();
	bench4.add("With validator passes", done => {
		return broker.call("users.validate", { id: 5 }).then(done);
	});
})();

(function () {
	const broker = createBroker();
	bench4.add("With validator fail", done => {
		return broker.call("users.validate", { id: "a5" }).catch(done);
	});
})();

// ----------------------------------------------------------------
const bench5 = benchmark.createSuite("Call with metrics");

(function () {
	const broker = createBroker();
	bench5.ref("No metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function () {
	const broker = createBroker({ metrics: true });
	bench5.add("With metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
const bench6 = benchmark.createSuite("Call with tracing");

(function () {
	const broker = createBroker();
	bench6.ref("No tracing", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function () {
	const broker = createBroker({ tracing: true });
	bench6.add("With tracing", done => {
		return broker.call("users.empty").then(done);
	});
})();

setTimeout(() => {
	benchmark.run([bench1, bench2, bench3, bench4, bench5, bench6]);
}, 1000);

/*

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ broker.call (normal)*             1,660,419 rps
√ broker.call (with params)*        1,706,815 rps

   broker.call (normal)* (#)            0%      (1,660,419 rps)   (avg: 602ns)
   broker.call (with params)*       +2.79%      (1,706,815 rps)   (avg: 585ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares*        1,604,740 rps
√ Call with 1 middleware*          1,195,061 rps
√ Call with 5 middlewares*           655,822 rps

   Call without middlewares* (#)       0%      (1,604,740 rps)   (avg: 623ns)
   Call with 1 middleware*        -25.53%      (1,195,061 rps)   (avg: 836ns)
   Call with 5 middlewares*       -59.13%        (655,822 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher*                            1,180,739 rps
√ Built-in cacher*                        611,911 rps
√ Built-in cacher (keys filter)*          893,071 rps

   No cacher* (#)                           0%      (1,180,739 rps)   (avg: 846ns)
   Built-in cacher*                    -48.18%        (611,911 rps)   (avg: 1μs)
   Built-in cacher (keys filter)*      -24.36%        (893,071 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator*                 1,192,808 rps
√ With validator passes*        1,138,172 rps
√ With validator fail*              4,829 rps

   No validator* (#)                0%      (1,192,808 rps)   (avg: 838ns)
   With validator passes*       -4.58%      (1,138,172 rps)   (avg: 878ns)
   With validator fail*         -99.6%          (4,829 rps)   (avg: 207μs)
-----------------------------------------------------------------------

Suite: Call with metrics
√ No metrics*          1,601,825 rps
√ With metrics*          493,759 rps

   No metrics* (#)         0%      (1,601,825 rps)   (avg: 624ns)
   With metrics*      -69.18%        (493,759 rps)   (avg: 2μs)
-----------------------------------------------------------------------

*/
