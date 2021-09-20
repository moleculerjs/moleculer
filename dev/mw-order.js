"use strict";

const { ServiceBroker, Middlewares } = require("../");

Middlewares.MyMiddleware = {
	name: "MyMiddleware",
	localAction(next, action) {
		return async ctx => {
			ctx.broker.logger.info("MyMW before");
			const res = await next(ctx);
			ctx.broker.logger.info("MyMW after");
			return res;
		};
	}
};

const broker = new ServiceBroker({
	nodeID: "mw",
	cacher: "Memory",
	internalMiddlewares: false,
	middlewares: ["Cacher", "ActionHook", "MyMiddleware"]
});

broker.createService({
	name: "test",
	actions: {
		hello: {
			cache: true,
			hooks: {
				before: ctx => ctx.broker.logger.info("  Hook before"),
				after: (ctx, res) => {
					ctx.broker.logger.info("  Hook after");
					return res;
				}
			},
			handler(ctx) {
				broker.logger.info("    Call action");
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start().then(async () => {
	broker.repl();

	await broker.call("test.hello", { name: "John" });
	await broker.call("test.hello", { name: "John" });
	await broker.call("test.hello", { name: "John" });
});
