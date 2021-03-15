const { ServiceBroker } = require("../");

const transporter = process.env.TRANSPORTER || "NATS";

function createBroker(nodeID) {
	return new ServiceBroker({
		nodeID,
		transporter,
		logger: console,
		logLevel: "info"
	});
}

// Create brokers
const brokerClient = createBroker("client");
const broker1 = createBroker("demo1");
const broker2 = createBroker("demo2");
const broker3 = createBroker("demo3");
const brokerListen = createBroker("listen");

broker1.createService({
	name: "demo1",
	dependencies: ["demo2"],
	actions: {
		hello1(ctx) {
			// console.log("call demo1.hello1 at: ", Date.now());
			return ctx.call("demo2.hello2");
		},
		hello1WithEvent(ctx) {
			broker1.emit("t1", { a: "abc", b: 123, c: true });
			// console.log("call demo1.hello1WithEvent at: ", Date.now());
			return ctx.call("demo2.hello2WithEvent");
		}
	}
});

broker2.createService({
	name: "demo2",
	dependencies: ["demo3"],
	actions: {
		hello2(ctx) {
			// console.log("call demo2.hello2 at: ", Date.now());
			return ctx.call("demo3.hello3");
		},
		hello2WithEvent(ctx) {
			broker2.emit("t2", { a: "abc", b: 123, c: true });
			// console.log("call demo2.hello2WithEvent at: ", Date.now());
			return ctx.call("demo3.hello3WithEvent");
		}
	}
});

broker3.createService({
	name: "demo3",
	dependencies: ["listen"],
	actions: {
		hello3(ctx) {
			// console.log("call demo3.hello3 at: ", Date.now());
			return "hello from demo3";
		},
		hello3WithEvent(ctx) {
			broker3.emit("t3", { a: "abc", b: 123, c: true });
			//console.log("call demo3.hello3WithEvent at: ", Date.now());
			return "hello from hello3WithEvent";
		}
	}
});

brokerListen.createService({
	name: "listen",
	events: {
		t1: (ctx) => {
			//console.log("listen t1 at: ", Date.now());
		},
		t2: (ctx) => {
			//console.log("listen t2 at: ", Date.now());
		},
		t3: (ctx) => {
			//console.log("listen t3 at: ", Date.now());
		},
	}
});

brokerClient.Promise.all([brokerClient.start(), broker1.start(), broker2.start(), broker3.start(), brokerListen.start()])
	.delay(1000)
	.then(() => brokerClient.waitForServices("demo1"))
	/*.then(async () => {

		let startTime = Date.now();
		await brokerClient.call("demo1.hello1");
		let endTime = Date.now();
		console.log("call demo1.hello1 use time = ", endTime - startTime);

		startTime = Date.now();
		await brokerClient.call("demo1.hello1WithEvent");
		endTime = Date.now();
		console.log("call demo1.hello1WithEvent use time = ", endTime - startTime);

		// startTime = Date.now()
		// await brokerClient.call('demo1.hello1WithEvent')
		// endTime = Date.now()
		// console.log("call demo1.hello1WithEvent again use time = ", endTime - startTime)

	});*/

	.then(() => {

		let count = 0;
		function doRequest() {
			count++;
			//return brokerClient.call("demo1.hello1")
			return brokerClient.call("demo1.hello1WithEvent")
				.then(() => {
					if (count % 10000) {
						// Fast cycle
						doRequest();
					} else {
						// Slow cycle
						setImmediate(() => doRequest());
					}
				});
		}

		let startTime = Date.now();

		setInterval(() => {
			let rps = count / ((Date.now() - startTime) / 1000);
			console.log("RPS:", rps.toLocaleString("hu-HU", {maximumFractionDigits: 0}), "req/s");
			count = 0;
			startTime = Date.now();
		}, 1000);

		doRequest();
	});
