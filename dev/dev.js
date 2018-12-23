const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	//namespace: "test",
	nodeID: "broker-1",
	transporter: "NATS",
	middlewares: [
		{
			localCall: (next) => {
				return function(ctx) {
					console.log("The \"call\" is called.", ctx.action.name);
					return next(ctx).then(res => {
						console.log("Response:", res);
						return res;
					});
				};
			},
		},
	],
});

broker.createService({
	name: "test1",
	settings: {
		rest: true
	},
	actions: {
		test: {
			rest: "hello",
			handler(ctx) {
				ctx.meta.x = 3;
				return "Hello World";
			}
		},
	},
});

broker.createService({
	name: "test2",
	actions: {
		test: (ctx) => {
			return ctx.call("test1.test");
		},
	},
});

broker.start().then(() => {
	const meta = { x: 2 };
	broker.call("test2.test", {}, { meta }).then((msg) => {
		console.log(msg, meta);
	});
});
