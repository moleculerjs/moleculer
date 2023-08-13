const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const P = require("../../../src/packets");
const C = require("../../../src/constants");

jest.mock("kafkajs");

let Kafka = require("kafkajs");

const FakeKafkaAdmin = {
	connect: jest.fn(),
	disconnect: jest.fn(),
	createTopics: jest.fn()
};

const FakeKafkaProducer = {
	connect: jest.fn(),
	disconnect: jest.fn(),
	send: jest.fn()
};

let consumerRunOpts = {};
const FakeKafkaConsumer = {
	connect: jest.fn(),
	disconnect: jest.fn(),
	subscribe: jest.fn(),
	events: {
		GROUP_JOIN: "consumer.group_join"
	},
	on: jest.fn((event, cb) => {
		if (event == "consumer.group_join") cb();
	}),
	run: jest.fn(opts => {
		consumerRunOpts = opts;
	})
};

const FakeKafkaClient = {
	admin: jest.fn(() => FakeKafkaAdmin),
	producer: jest.fn(() => FakeKafkaProducer),
	consumer: jest.fn(() => FakeKafkaConsumer)
};

Kafka.Kafka = jest.fn(() => FakeKafkaClient);
/*
const producerCallbacks = {};
Kafka.Producer = jest.fn(() => {
	return {
		on: jest.fn((event, cb) => (producerCallbacks[event] = cb)),
		//disconnect: jest.fn(),
		//subscribe: jest.fn(),
		send: jest.fn((data, cb) => cb()),

		callbacks: producerCallbacks
	};
});
const groupCallbacks = {};
Kafka.ConsumerGroup = jest.fn(() => {
	return {
		on: jest.fn((event, cb) => (groupCallbacks[event] = cb)),
		close: jest.fn(cb => (groupCallbacks.close = cb)),
		callbacks: groupCallbacks
	};
});
*/
const KafkaTransporter = require("../../../src/transporters/kafka");

describe("Test KafkaTransporter constructor", () => {
	it("check constructor", () => {
		let transporter = new KafkaTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({
			client: {
				brokers: null,
				logCreator: expect.any(Function),
				logLevel: 1
			},
			producer: {},
			consumer: {},
			publish: {},
			publishMessage: {
				partition: 0
			}
		});
		expect(transporter.connected).toBe(false);
		expect(transporter.client).toBeNull();
		expect(transporter.producer).toBeNull();
		expect(transporter.consumer).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new KafkaTransporter("localhost:9092");
		expect(transporter.opts).toEqual({
			client: {
				brokers: ["localhost:9092"],
				logCreator: expect.any(Function),
				logLevel: 1
			},
			producer: {},
			consumer: {},
			publish: {},
			publishMessage: {
				partition: 0
			}
		});
	});

	it("check constructor with options", () => {
		let opts = {
			client: {
				brokers: ["localhost:9092"]
			},
			publishMessage: {
				partition: 1
			}
		};
		let transporter = new KafkaTransporter(opts);
		expect(transporter.opts).toEqual({
			client: {
				brokers: ["localhost:9092"],
				logCreator: expect.any(Function),
				logLevel: 1
			},
			producer: {},
			consumer: {},
			publish: {},
			publishMessage: {
				partition: 1
			}
		});
	});
});

describe("Test KafkaTransporter connect & disconnect", () => {
	let broker = new ServiceBroker({ logger: false });
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new KafkaTransporter({
			client: {
				some: "thing"
			},
			producer: {
				extraProp: 7
			}
		});
		transporter.init(transit, msgHandler);
	});

	it("check connect", async () => {
		await transporter.connect();
		expect(transporter.client).toBeDefined();
		expect(transporter.admin).toBeDefined();
		expect(transporter.producer).toBeDefined();

		expect(Kafka.Kafka).toHaveBeenCalledTimes(1);
		expect(Kafka.Kafka).toHaveBeenCalledWith({
			brokers: null,
			logCreator: expect.any(Function),
			logLevel: 1,
			some: "thing"
		});

		expect(FakeKafkaClient.producer).toHaveBeenCalledTimes(1);
		expect(FakeKafkaClient.producer).toHaveBeenCalledWith({
			extraProp: 7
		});
	});

	it("check connect - should broadcast error", async () => {
		broker.broadcastLocal = jest.fn();

		const origErr = new Error("Ups");
		FakeKafkaAdmin.connect = jest.fn(() => Promise.reject(origErr));
		try {
			await transporter.connect();
			expect(1).toBe(2);
		} catch (err) {
			expect(err).toBe(origErr);
			expect(transporter.producer).toBeDefined();

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenNthCalledWith(1, "$transporter.error", {
				error: origErr,
				module: "transporter",
				type: C.FAILED_PUBLISHER_ERROR
			});
		}
		FakeKafkaAdmin.connect = jest.fn();
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter.connect().then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		return p;
	});

	it("check disconnect", async () => {
		await transporter.connect();
		await transporter.makeSubscriptions([
			{ cmd: "REQ", nodeID: "node" },
			{ cmd: "RES", nodeID: "node" }
		]);
		await transporter.disconnect();

		expect(FakeKafkaAdmin.disconnect).toHaveBeenCalledTimes(1);
		expect(FakeKafkaProducer.disconnect).toHaveBeenCalledTimes(1);
		expect(FakeKafkaConsumer.disconnect).toHaveBeenCalledTimes(1);
	});
});

describe("Test KafkaTransporter makeSubscriptions", () => {
	let transporter;
	let msgHandler;

	beforeEach(async () => {
		msgHandler = jest.fn();
		transporter = new KafkaTransporter({
			client: { brokers: ["kafka://kafka-server:1234"] },
			consumer: { extraProp: 5 }
		});
		transporter.init(
			new Transit(new ServiceBroker({ logger: false, namespace: "TEST", nodeID: "node-1" })),
			msgHandler
		);

		await transporter.connect();
		transporter.incomingMessage = jest.fn();

		transporter.admin.createTopics.mockClear();
	});

	it("check makeSubscriptions", async () => {
		FakeKafkaClient.consumer.mockClear();
		FakeKafkaConsumer.connect.mockClear();

		await transporter.makeSubscriptions([
			{ cmd: "REQ", nodeID: "node" },
			{ cmd: "RES", nodeID: "node" }
		]);

		expect(transporter.admin.createTopics).toHaveBeenCalledTimes(1);
		expect(transporter.admin.createTopics).toHaveBeenCalledWith({
			topics: [{ topic: "MOL-TEST.REQ.node" }, { topic: "MOL-TEST.RES.node" }]
		});

		expect(FakeKafkaClient.consumer).toHaveBeenCalledTimes(1);
		expect(FakeKafkaClient.consumer).toHaveBeenCalledWith({
			groupId: transporter.broker.instanceID,
			extraProp: 5
		});

		expect(FakeKafkaConsumer.connect).toHaveBeenCalledTimes(1);
		expect(transporter.consumer).toBeDefined();

		consumerRunOpts.eachMessage({
			topic: "MOL.INFO.node-2",
			message: {
				value: '{ ver: "3" }'
			}
		});
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("INFO", '{ ver: "3" }');
	});

	it("check makeSubscriptions - should broadcast an error", async () => {
		transporter.broker.broadcastLocal = jest.fn();

		const origErr = new Error("Ups");
		transporter.admin.createTopics = jest.fn(() => Promise.reject(origErr));

		try {
			await transporter.makeSubscriptions([
				{ cmd: "REQ", nodeID: "node" },
				{ cmd: "RES", nodeID: "node" }
			]);
			expect(1).toBe(2);
		} catch (err) {
			expect(err).toBe(origErr);
			expect(transporter.producer).toBeDefined();

			expect(transporter.broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(transporter.broker.broadcastLocal).toHaveBeenCalledWith("$transporter.error", {
				error: origErr,
				module: "transporter",
				type: C.FAILED_TOPIC_CREATION
			});
		}

		transporter.admin.createTopics = jest.fn();
	});

	it("check makeSubscriptions - should broadcast a consumer error", async () => {
		transporter.broker.broadcastLocal = jest.fn();

		const origErr = new Error("Ups");
		FakeKafkaConsumer.run = jest.fn(() => {
			throw origErr;
		});

		try {
			await transporter.makeSubscriptions([
				{ cmd: "REQ", nodeID: "node" },
				{ cmd: "RES", nodeID: "node" }
			]);
			expect(1).toBe(2);
		} catch (err) {
			expect(err).toBe(origErr);
			expect(transporter.broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(transporter.broker.broadcastLocal).toHaveBeenCalledWith("$transporter.error", {
				error: origErr,
				module: "transporter",
				type: C.FAILED_CONSUMER_ERROR
			});
		}

		FakeKafkaConsumer.run = jest.fn();
	});
});

describe("Test KafkaTransporter subscribe & publish", () => {
	let transporter;
	let msgHandler;

	beforeEach(async () => {
		msgHandler = jest.fn();
		transporter = new KafkaTransporter({
			client: { brokers: ["kafka://kafka-server:1234"] },
			publish: { extraProp: 5 },
			publishMessage: { partition: 2 }
		});
		transporter.init(
			new Transit(new ServiceBroker({ logger: false, namespace: "TEST", nodeID: "node1" })),
			msgHandler
		);
		transporter.serialize = jest.fn(() => Buffer.from("json data"));

		await transporter.connect();
	});

	it("check publish", async () => {
		transporter.producer.send.mockClear();
		const packet = new P.Packet(P.PACKET_INFO, "node2", { services: {} });
		await transporter.publish(packet);

		expect(transporter.producer.send).toHaveBeenCalledTimes(1);
		expect(transporter.producer.send).toHaveBeenCalledWith({
			topic: "MOL-TEST.INFO.node2",
			messages: [{ value: Buffer.from("json data"), partition: 2 }],
			extraProp: 5
		});

		expect(transporter.serialize).toHaveBeenCalledTimes(1);
		expect(transporter.serialize).toHaveBeenCalledWith(packet);
	});

	it("check publish - should broadcast a publisher error", async () => {
		transporter.broker.broadcastLocal = jest.fn();

		const origErr = new Error("Ups");
		FakeKafkaProducer.send = jest.fn(() => {
			throw origErr;
		});

		try {
			const packet = new P.Packet(P.PACKET_INFO, "node2", { services: {} });
			await transporter.publish(packet);
			expect(1).toBe(2);
		} catch (err) {
			expect(err).toBe(origErr);
			expect(transporter.broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(transporter.broker.broadcastLocal).toHaveBeenCalledWith("$transporter.error", {
				error: origErr,
				module: "transporter",
				type: C.FAILED_PUBLISHER_ERROR
			});
		}

		FakeKafkaConsumer.run = jest.fn();
	});
});
