const { ServiceBroker } = require("../");
const broker = new ServiceBroker({
	logLevel: "debug",
	namespace: "streamissue",
	nodeID: "listener",
	transporter: "NATS"
	/*errorHandler: (err, info) => {
		console.error("Error occurred:", err);
	}*/
});

async function test(ctx) {
	throw new Error("Tehee");
}

async function start() {
	try {
		await broker.start();
		await broker.createService({
			name: "notpublisher",
			actions: { listener: async ctx => await test(ctx) }
		});
	} catch (err) {
		console.error(err);
	}
}

(async () => {
	await start();
})();
