export default {
	namespace: "esm",
	tracing: {
		enabled: true,
		exporter: [
			{
				type: "Console",
				options: {
					colors: true
				}
			}
		]
	},

	async started(broker) {
		try {
			await broker.call("greeter.hello");
			const res = await broker.call("greeter.welcome", { name: "esm" });
			broker.logger.info("");
			broker.logger.info("Result: ", res);
			broker.logger.info("");
			if (res != "Welcome, ESM!") throw new Error("Result is mismatch!");
			else await broker.stop();
		} catch (err) {
			broker.logger.error(err);
			process.exit(1);
		}
	}
};
