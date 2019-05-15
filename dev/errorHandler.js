const { ServiceBroker } = require("..");

const broker = new ServiceBroker({
	errorHandler(err, info) {
		this.logger.warn("Error handled:", err);
	}
});

broker.createService({
	name: "greeter",
	actions: {
		async hello(ctx) {
			throw new Error("Something went wrong");
		}
	},
	events: {
		"test.event": [
			() => {
				console.log("Called first handler");
				throw new Error("Error in event handler");
			},
			() => { console.log("Called second handler"); },
		]
	}
});

broker.createService({
	name: "events",
	events: {
		"test.event": () => { console.log("Called third handler"); },
	}
});

(async function() {
	await broker.start();

	try {
		await broker.call("greeter2.hello");
		//broker.broadcast("test.event", { a: 5 });
	} catch(err) {
		broker.logger.error("Catched error", err);
	}

	broker.repl();
})();
