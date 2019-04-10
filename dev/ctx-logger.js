const winston = require("winston");

const ServiceBroker = require("../src/service-broker");
const { extend } = require("../src/logger");

const CtxLoggerMiddleware = {
	localAction(next, action) {
		return ctx => {
			ctx.logger = ctx.service.logger.child({ requestId: ctx.requestID });

			return next(ctx);
		};
	}
};

const broker = new ServiceBroker({
	middlewares: [
		CtxLoggerMiddleware
	],
	logger: bindings => extend(winston.createLogger({
		format: winston.format.combine(
			winston.format.label({ label: bindings }),
			winston.format.timestamp(),
			winston.format.json(),
		),
		transports: [
			new winston.transports.Console()
		]
	}))
});

broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			ctx.logger.info("Hello from Context");
		}
	}
});


broker.start().then(() => {
	broker.repl();

	return broker.call("greeter.hello", null, { requestID: "123456789" });
});
