const queueNames = [
	"MOL.DISCONNECT.event-pub-nodeID",
	"MOL.DISCONNECT.event-sub1-nodeID",
	"MOL.DISCONNECT.event-sub2-nodeID",
	"MOL.DISCONNECT.event-sub3-nodeID",
	"MOL.DISCONNECT.five-request-nodeID",
	"MOL.DISCONNECT.single-request-nodeID",
	"MOL.DISCONNECT.slow-nodeID",
	"MOL.DISCONNECT.timestamped-nodeID",
	"MOL.DISCONNECT.too-slow-nodeID",
	"MOL.DISCONNECT.worker1-nodeID",
	"MOL.DISCONNECT.worker2-nodeID",
	"MOL.DISCOVER.event-pub-nodeID",
	"MOL.DISCOVER.event-sub1-nodeID",
	"MOL.DISCOVER.event-sub2-nodeID",
	"MOL.DISCOVER.event-sub3-nodeID",
	"MOL.DISCOVER.five-request-nodeID",
	"MOL.DISCOVER.single-request-nodeID",
	"MOL.DISCOVER.slow-nodeID",
	"MOL.DISCOVER.timestamped-nodeID",
	"MOL.DISCOVER.too-slow-nodeID",
	"MOL.DISCOVER.worker1-nodeID",
	"MOL.DISCOVER.worker2-nodeID",
	"MOL.EVENT.event-pub-nodeID",
	"MOL.EVENT.event-sub1-nodeID",
	"MOL.EVENT.event-sub2-nodeID",
	"MOL.EVENT.event-sub3-nodeID",
	"MOL.EVENT.five-request-nodeID",
	"MOL.EVENT.single-request-nodeID",
	"MOL.EVENT.slow-nodeID",
	"MOL.EVENT.timestamped-nodeID",
	"MOL.EVENT.too-slow-nodeID",
	"MOL.EVENT.worker1-nodeID",
	"MOL.EVENT.worker2-nodeID",
	"MOL.HEARTBEAT.event-pub-nodeID",
	"MOL.HEARTBEAT.event-sub1-nodeID",
	"MOL.HEARTBEAT.event-sub2-nodeID",
	"MOL.HEARTBEAT.event-sub3-nodeID",
	"MOL.HEARTBEAT.five-request-nodeID",
	"MOL.HEARTBEAT.single-request-nodeID",
	"MOL.HEARTBEAT.slow-nodeID",
	"MOL.HEARTBEAT.timestamped-nodeID",
	"MOL.HEARTBEAT.too-slow-nodeID",
	"MOL.HEARTBEAT.worker1-nodeID",
	"MOL.HEARTBEAT.worker2-nodeID",
	"MOL.INFO.event-pub-nodeID",
	"MOL.INFO.event-sub1-nodeID",
	"MOL.INFO.event-sub2-nodeID",
	"MOL.INFO.event-sub3-nodeID",
	"MOL.INFO.five-request-nodeID",
	"MOL.INFO.single-request-nodeID",
	"MOL.INFO.slow-nodeID",
	"MOL.INFO.timestamped-nodeID",
	"MOL.INFO.too-slow-nodeID",
	"MOL.INFO.worker1-nodeID",
	"MOL.INFO.worker2-nodeID",
	"MOL.REQ.testing.hello",
	"MOL.RES.event-pub-nodeID",
	"MOL.RES.event-sub1-nodeID",
	"MOL.RES.event-sub2-nodeID",
	"MOL.RES.event-sub3-nodeID",
	"MOL.RES.five-request-nodeID",
	"MOL.RES.single-request-nodeID",
	"MOL.RES.slow-nodeID",
	"MOL.RES.timestamped-nodeID",
	"MOL.RES.too-slow-nodeID",
	"MOL.RES.worker1-nodeID",
	"MOL.RES.worker2-nodeID",
];
const exchanges = [
	"MOL.DISCONNECT",
	"MOL.DISCOVER",
	"MOL.EVENT",
	"MOL.HEARTBEAT",
	"MOL.INFO",
];

const amqp = require("amqplib");
let connectionRef;

amqp.connect("amqp://guest:guest@localhost:5672")
	.then(connection => {
		console.info("AMQP connected!");
		connectionRef = connection;
		return connection
			.on("error", (err) => {
				console.error("AMQP connection error!", err);
				process.exit(1);
			})
			.on("close", (err) => {
				const crashWorthy = require("amqplib/lib/connection").isFatalError(err);
				console.error("AMQP connection closed!", crashWorthy && err ||  "");
				process.exit(1);
			})
			.createChannel();
	})
	.then((channel) => {
		console.info("AMQP channel created!");
		channel
			.on("close", () => {
				console.warn("AMQP channel closed!");
				process.exit(1);
			})
			.on("error", (error) => {
				console.error("AMQP channel error!", error);
				process.exit(1);
			});

		return Promise.all(queueNames.map(q => channel.deleteQueue(q)))
			.then(() => Promise.all(exchanges.map(e => channel.deleteExchange(e))));
	})
	.then(() => {
		console.log("Done.");
		return connectionRef.close();
	})
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("AMQP failed to create channel!", err);
		process.exit(1);
	});