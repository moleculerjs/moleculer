const { ServiceBroker } = require("../");

// Create broker Client
const brokerClient = new ServiceBroker({
	nodeID: "client",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "demo1",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "demo2",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

// Create broker #3
const broker3 = new ServiceBroker({
	nodeID: "demo3",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

// Create brokerListen
const brokerListen = new ServiceBroker({
	nodeID: "listen",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

broker1.createService({
	name: "demo1",
	actions: {
		hello1(ctx) {
			console.log("call demo1.hello1 at: ", Date.now());
			return ctx.call("demo2.hello2");
		},
		hello1WithEvent(ctx) {
			broker1.emit("t1", { a: "abc", b: 123, c: true });
			console.log("call demo1.hello1WithEvent at: ", Date.now());
			return ctx.call("demo2.hello2WithEvent");
		}
	}
});

broker2.createService({
	name: "demo2",
	actions: {
		hello2(ctx) {
			console.log("call demo2.hello2 at: ", Date.now());
			return ctx.call("demo3.hello3");
		},
		hello2WithEvent(ctx) {
			broker2.emit("t2", { a: "abc", b: 123, c: true });
			console.log("call demo2.hello2WithEvent at: ", Date.now());
			return ctx.call("demo3.hello3WithEvent");
		}
	}
});

broker3.createService({
	name: "demo3",
	actions: {
		hello3(ctx) {
			console.log("call demo3.hello3 at: ", Date.now());
			return "hello from demo3";
		},
		hello3WithEvent(ctx) {
			broker3.emit("t3", { a: "abc", b: 123, c: true });
			console.log("call demo3.hello3WithEvent at: ", Date.now());
			return "hello from hello3WithEvent";
		}
	}
});

brokerListen.createService({
	name: "listen",
	events: {
		t1: (ctx) => {
			console.log("listen t1 at: ", Date.now());
		},
		t2: (ctx) => {
			console.log("listen t2 at: ", Date.now());
		},
		t3: (ctx) => {
			console.log("listen t3 at: ", Date.now());
		},
	}
});

brokerClient.Promise.all([brokerClient.start(), broker1.start(), broker2.start(), broker3.start(), brokerListen.start()])
	.delay(2000)
	.then(async () => {

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

	});
