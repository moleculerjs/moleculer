const { ServiceBroker } = require("..");

const ErrorMiddleware = {
	localEvent(next) {
		return async (payload) => {
			try {
				console.log("Begin localEvent");
				await next(payload);
				console.log("End localEvent");
			} catch (e) {
				console.log("Catched:", e);
				throw e;
			}
		};
	}
};

const broker = new ServiceBroker({
	nodeID: "broker1",
	middlewares: [
		ErrorMiddleware
	],
	//transporter: "NATS"
});
/*
con/st broker2 = new ServiceBroker({
	nodeID: "broker2",
	transporter: "NATS"
});*/

const sleep = ms => new Promise(res => setTimeout(res, ms));

broker.createService({
	name: "my",
	events: {
		yo: [
			async function (payload) {
				console.log("1 Begin yo", payload);
				await sleep(1000);
				console.log("1 End yo", payload);
				//throw new Error("1 Capture me");
			},
			async function (payload) {
				console.log("2 Begin yo", payload);
				await sleep(1000);
				console.log("2 End yo", payload);
				throw new Error("2 Capture me");
			}
		]
	}
});

(async function() {
	await broker.start();
	//await broker2.start();

	await sleep(1000);
	broker2.emit("yo", "world");
	// broker.broadcast("yo", "world");
	// broker.broadcastLocal("yo", "world");

	//broker2.repl();
})();
