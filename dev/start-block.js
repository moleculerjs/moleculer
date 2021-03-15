"use strict";

let ServiceBroker = require("../src/service-broker");

// --- CONSUMER ---
(function() {
	const broker = new ServiceBroker({
		nodeID: "consumer",
		logger: true,
		//logLevel: "debug",
		transporter: "TCP"
	});

	broker.createService({
		name: "math",
		actions: {
			add(ctx) {
				this.logger.info("Call add...");
				return this.calc(ctx.params.a, ctx.params.b);
			}
		},
		started() {
			this.logger.info("Starting service...");
			return this.Promise.delay(5000).then(() => {
				this.calc = (a, b) => Number(a) + Number(b);

				this.logger.info("Service started!");
			});
		}
	});

	broker.start();
})();

// --- PRODUCER ---
(function() {
	const broker = new ServiceBroker({
		nodeID: "producer",
		logger: true,
		transporter: "TCP"
	});

	broker.createService({
		name: "dep-test",
		dependencies: "math",
		started() {
			setInterval(() => {
				broker.call("math.add", { a: 5, b: 3 })
					.then(res => broker.logger.info(res))
					.catch(err => broker.logger.error(err.message));
			}, 1000);
		}
	});

	broker.start();
})();
