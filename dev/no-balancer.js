const ServiceBroker = require("../src/service-broker");
const chalk = require("chalk");
const NATS = require("nats");

const broker = new ServiceBroker({
	nodeID: "broker-1",
	transporter: "NATS",
	disableBalancer: true,
	logLevel: "info"
});

broker.start().then(() => {
	setInterval(() => {
		broker.logger.info(chalk.yellow("Send..."));
		//broker.emit("test.event", { ddata: "this is test data" }, ["group"]);
		broker.broadcast("test.event", { data: "this is test data" }, ["group"]);
		//broker.call("some.thing");
	}, 2000);
});


const nats1 = NATS.connect({
	url: "nats://localhost:4222",
	name: "nodejs-subscriber-1"
});

nats1.subscribe("MOL.EVENTB.group.test.event", /*{ queue: "group" },*/ message => {
	broker.logger.info(chalk.green.bold("nodejs-subscriber1: Test event received with payload:"), message);
});

const nats2 = NATS.connect({
	url: "nats://localhost:4222",
	name: "nodejs-subscriber-1"
});

nats2.subscribe("MOL.EVENTB.group.test.event", /*{ queue: "group" },*/ message => {
	broker.logger.info(chalk.magenta.bold("nodejs-subscriber2: Test event received with payload:"), message);
});
