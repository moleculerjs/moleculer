const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const P = require("../../../src/packets");

jest.mock("kafka-node");

let Kafka = require("kafka-node");
const clientCallbacks = {};
let clientCloseCB;
Kafka.KafkaClient = jest.fn(() => {
	return {
		close: jest.fn(cb => clientCloseCB = cb),
		callbacks: clientCallbacks
	};
});
const producerCallbacks = {};
Kafka.Producer = jest.fn(() => {
	return {
		on: jest.fn((event, cb) => producerCallbacks[event] = cb),
		//disconnect: jest.fn(),
		//subscribe: jest.fn(),
		send: jest.fn((data, cb) => cb()),

		callbacks: producerCallbacks
	};
});
const groupCallbacks = {};
Kafka.ConsumerGroup = jest.fn(() => {
	return {
		on: jest.fn((event, cb) => groupCallbacks[event] = cb),
		close: jest.fn(cb => groupCallbacks.close = cb),
		callbacks: groupCallbacks
	};
});

const KafkaTransporter = require("../../../src/transporters/kafka");

describe("Test KafkaTransporter constructor", () => {

	it("check constructor", () => {
		let transporter = new KafkaTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({
			"host": undefined,
			"client": {
				"noAckBatchOptions": undefined,
				"sslOptions": undefined,
				"zkOptions": undefined
			},
			"customPartitioner": undefined,
			"producer": {},
			"consumer": {},
			"publish": {
				"attributes": 0,
				"partition": 0
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
			"host": "localhost:9092",
			"client": {
				"kafkaHost": "localhost:9092",
			},
			"customPartitioner": undefined,
			"producer": {},
			"consumer": {},
			"publish": {
				"attributes": 0,
				"partition": 0
			}
		});
	});

	it("check constructor with options", () => {
		let opts = { host: "localhost:9092", publish: {
			partition: 1
		} };
		let transporter = new KafkaTransporter(opts);
		expect(transporter.opts).toEqual({
			"host": "localhost:9092",
			"client": {
				"kafkaHost": "localhost:9092"
			},
			"customPartitioner": undefined,
			"producer": {},
			"consumer": {},
			"publish": {
				"attributes": 0,
				"partition": 1
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
		transporter = new KafkaTransporter();
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().then(() => {
			expect(transporter.client).toBeDefined();
			expect(transporter.producer).toBeDefined();
			expect(transporter.producer.on).toHaveBeenCalledTimes(2);
			expect(transporter.producer.on).toHaveBeenCalledWith("ready", jasmine.any(Function));
			expect(transporter.producer.on).toHaveBeenCalledWith("error", jasmine.any(Function));
		});

		transporter.producer.callbacks.ready();

		return p;
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter.connect().then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		transporter.producer.callbacks.ready();

		return p;
	});

	it("check disconnect", () => {
		let p = transporter.connect().then(() => {
			let close = transporter.client.close;
			let close2 = jest.fn(cb => cb());
			transporter.consumer = {
				close: close2
			};
			transporter.disconnect();
			expect(close).toHaveBeenCalledTimes(1);
			clientCloseCB();
			expect(close2).toHaveBeenCalledTimes(1);
		});

		transporter.producer.callbacks.ready(); // Trigger the `resolve`
		return p;
	});

});


describe("Test KafkaTransporter makeSubscriptions", () => {
	let transporter;
	let msgHandler;

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new KafkaTransporter("kafka://kafka-server:1234");
		transporter.init(new Transit(new ServiceBroker({ logger: false, namespace: "TEST", nodeID: "node-1" })), msgHandler);

		let p = transporter.connect();
		transporter.producer.callbacks.ready(); // Trigger the `resolve`
		transporter.incomingMessage = jest.fn();
		return p;
	});

	it("check makeSubscriptions", () => {
		transporter.producer.createTopics = jest.fn((topics, a, cb) => cb());
		transporter.makeSubscriptions([
			{ cmd: "REQ", nodeID: "node" },
			{ cmd: "RES", nodeID: "node" }
		]);

		expect(transporter.producer.createTopics).toHaveBeenCalledTimes(1);
		expect(transporter.producer.createTopics).toHaveBeenCalledWith(["MOL-TEST.REQ.node", "MOL-TEST.RES.node"], true, jasmine.any(Function));

		expect(Kafka.ConsumerGroup).toHaveBeenCalledTimes(1);
		expect(Kafka.ConsumerGroup).toHaveBeenCalledWith( {
			"encoding": "buffer",
			"fromOffset": "latest",
			"groupId": "node-1",
			"kafkaHost": "kafka-server:1234",
			"id": "default-kafka-consumer"
		}, ["MOL-TEST.REQ.node", "MOL-TEST.RES.node"]);

		expect(transporter.consumer).toBeDefined();

		expect(transporter.consumer.on).toHaveBeenCalledTimes(3);
		expect(transporter.consumer.on).toHaveBeenCalledWith("error", jasmine.any(Function));
		expect(transporter.consumer.on).toHaveBeenCalledWith("message", jasmine.any(Function));
		expect(transporter.consumer.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
		transporter.consumer.callbacks.connect();

		transporter.consumer.callbacks.message({
			topic: "MOL.INFO.node-2",
			value: "{ ver: \"3\" }"
		});
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("INFO", "{ ver: \"3\" }");

	});
});

describe("Test KafkaTransporter subscribe & publish", () => {
	let transporter;
	let msgHandler;

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new KafkaTransporter();
		transporter.init(new Transit(new ServiceBroker({ logger: false, namespace: "TEST", nodeID: "node1" })), msgHandler);
		transporter.serialize = jest.fn(() => Buffer.from("json data"));

		let p = transporter.connect();
		transporter.producer.callbacks.ready(); // Trigger the `resolve`
		return p;
	});

	it("check publish", () => {
		transporter.producer.send.mockClear();
		const packet = new P.Packet(P.PACKET_INFO, "node2", { services: {} });
		transporter.publish(packet);

		expect(transporter.producer.send).toHaveBeenCalledTimes(1);
		expect(transporter.producer.send).toHaveBeenCalledWith([{
			topic: "MOL-TEST.INFO.node2",
			messages: [Buffer.from("json data")],
			partition: 0,
			attributes: 0
		}], jasmine.any(Function));

		expect(transporter.serialize).toHaveBeenCalledTimes(1);
		expect(transporter.serialize).toHaveBeenCalledWith(packet);

	});
});

