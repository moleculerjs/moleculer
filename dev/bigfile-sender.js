const { createReadStream } = require("fs");
const { ServiceBroker } = require("../");
const broker = new ServiceBroker({
	logLevel: "debug",
	namespace: "streamissue",
	nodeID: "sender",
	transporter: "NATS"
});

async function start() {
	try {
		await broker.start();
		console.log("Stream starting...");
		let stream = createReadStream("d:/100MB.zip");
		await broker.call("notpublisher.listener", null, { meta: { danger: "dsadsds" }, stream });
		console.log("Stream sent");
	} catch (err) {
		console.error(err);
		// process.exit(1);
	}
}

(async () => {
	await start();
})();
