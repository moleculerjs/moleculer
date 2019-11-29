let ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({ logLevel: "debug" });

broker.createService({
	name: "pre",
	version: 1,
	async created() {
		await broker.createService({
			name: "pos",
			version: 1
		});
	}
});

broker
	.start()
	.then(() => {
		return broker.waitForServices([
			{
				name: "pre",
				version: 1
			},
			{ name: "pos", version: 1 }
		]);
	})
	.then(() => {
		console.log("never reach here");
	});
