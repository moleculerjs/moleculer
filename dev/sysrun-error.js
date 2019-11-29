const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker();

const TestService = {
	name: "test",
	actions: {
		inspect: {
			params: {
				containerId: "string"
			},
			async handler(ctx) {
				console.log("inspect called");
			}
		},
		test: {
			async handler(ctx) {
				console.log("test called");
				// Calls the `util.inspect` who find the `service.actions.inspect` function & calls it.
				// https://nodejs.org/api/util.html#util_util_inspect_object_showhidden_depth_colors
				// The customInspect option default value is `true`.
				console.log(ctx);
			}
		}
	}
};

broker.createService({
	mixins: [TestService]
});

broker.start()
	.then(() => {
		return broker.call("test.test");
	})
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err.message));
