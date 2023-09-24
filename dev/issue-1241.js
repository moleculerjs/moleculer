const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	middlewares: [
		{
			call(next) {
				return (actionName, params, opts) => {
					const p = next(actionName, params, opts);

					const pp = p.then(res => {
						return res;
					});

					pp.ctx = p.ctx;

					return pp;
				};
			}
		}
	]
});

broker.createService({
	name: "statusCodeTest",

	actions: {
		testNotFound: {
			rest: "GET /testNotFound",
			handler(ctx) {
				ctx.meta.$statusCode = 404;
			}
		}
	}
});

broker.createService({
	name: "test",
	actions: {
		hello: {
			async handler(ctx) {
				await ctx.call("statusCodeTest.testNotFound");
				this.logger.info("Context meta", ctx.meta);
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();

	broker.call("test.hello").then(res => {
		console.log("Result:", res);
	});
});
