const ServiceBroker = require("../src/service-broker");
const { MoleculerServerError } = require("../src/errors");

const broker = new ServiceBroker({
	requestTimeout: 2000,

	// Reorder the internal middlewares
	internalMiddlewares: false,
	middlewares: [
		"ActionHook",
		"Validator",
		"Bulkhead",
		"Cacher",
		"ContextTracker",
		// Changes here start
		"Timeout",
		"CircuitBreaker",
		// Changes here end
		"Retry",
		"Fallback",
		"ErrorHandler",
		"Tracing",
		"Metrics",
		"Debounce",
		"Throttle"
	],

	circuitBreaker: {
		enabled: true,
		threshold: 0.5,
		windowTime: 10,
		minRequestCount: 5,
		halfOpenTime: 5 * 1000
	}
});

broker.createService({
	name: "greeter",
	actions: {
		welcome: {
			async handler(ctx) {
				await broker.Promise.delay(Math.random() * 4000);
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();
	setInterval(async () => {
		try {
			const res = await broker.call("greeter.welcome", { name: "John" });
			broker.logger.info(res);
		} catch (err) {
			broker.logger.error(err.message);
		}
	}, 1000);
});
