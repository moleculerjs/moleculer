/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");
const broker = new ServiceBroker({
	nodeID: "single-request-nodeID",
	logger: console,
	transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
});

broker.start();

setTimeout(() => process.exit(1), 10000);

const messageID = process.argv[2] || Date.now();

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + messageID })
		.then(console.log);
}, 1000);
