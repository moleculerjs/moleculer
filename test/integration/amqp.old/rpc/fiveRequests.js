/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");
const broker = new ServiceBroker({
	nodeID: "five-request-nodeID",
	logger: console,
	transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
});

broker.start();

setTimeout(() => process.exit(1), 10000);

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + (process.argv[2] || Date.now()) })
		.then(console.log);
}, 1000);

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + (process.argv[3] || Date.now()) })
		.then(console.log);
}, 2000);

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + (process.argv[4] || Date.now()) })
		.then(console.log);
}, 3000);

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + (process.argv[5] || Date.now()) })
		.then(console.log);
}, 4000);

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + (process.argv[6] || Date.now()) })
		.then(console.log);
}, 5000);

