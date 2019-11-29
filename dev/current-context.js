const { ServiceBroker } = require("../");

const broker = new ServiceBroker({
	logFormatter: "simple",
	requestTimeout: 5000,
	circuitBreaker: {
		enabled: true
	},
	retryPolicy: {
		enabled: true
	},
	/*middlewares: [
		{
			localAction(handler, action) {
				return async function (ctx) {
					try {
						scope.setSessionData(ctx);
						console.log(`getAsyncId localActionCtx: ${scope.getAsyncId()}`);

						return await handler(ctx);
					} finally {
						scope.setSessionData(null);

					}
				};
			}
		}
	]*/
});

broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			this.logger.info("hello:      ", ctx.id);
			return this.Promise.resolve().delay(50)
				.then(() => this.doSomething())
				.then(() => this.logger.info(""));

		}
	},
	methods: {
		doSomething() {
			this.logger.info("doSomething:", this.currentContext ? this.currentContext.id : "?");
			return this.Promise.resolve().delay(100);
		}
	}
});

broker.start().then(() => {
	broker.getLocalService("greeter").doSomething();

	broker
		.call("greeter.hello", { name: "CodeSandbox" })
		.then(() => broker.getLocalService("greeter").doSomething())
		.catch(err => broker.logger.error(err.message));

});
