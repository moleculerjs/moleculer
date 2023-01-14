const { ServiceBroker } = require("..");

const broker1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS"
});

const broker2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS"
	/*errorHandler(err, info) {
		this.logger.warn("Error handled:", err);
	}*/
});

broker2.createService({
	name: "test",

	events: {
		"test.event": [
			() => {
				console.log("Called first handler");
				throw new Error("Error in event handler");
			},
			() => {
				console.log("Called second handler");
			}
		]
	},
	started() {}
});

broker1.createService({
	name: "events",
	events: {
		"test.event": () => {
			console.log("Called third handler");
		}
	}
});

(async function () {
	await broker1.start();
	await broker2.start();

	// broker1.transit.sendEvent = () => Promise.reject(new Error("Unable to send"));

	await broker1.waitForServices("test");

	try {
		await broker1.broadcast("test.event", { a: 5 }, { throwError: true });
	} catch (err) {
		broker1.logger.warn("Catched error", err);
	}

	broker1.repl();
})();
