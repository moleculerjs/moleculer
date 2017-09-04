const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const { PacketInfo } = require("../../../src/packets");

jest.mock("amqplib");

let Amqp = require("amqplib");
Amqp.connect = jest.fn(() => {
	let connectionOnCallbacks = {};
	const ref = {};
	ref.connection = {
		on: jest.fn((event, cb) => {
			connectionOnCallbacks[event] = cb;
			return ref.connection;
		}),
		close: jest.fn(),
		connectionOnCallbacks,
		createChannel: jest.fn(() => {
			let channelOnCallbacks = {};
			let ref = {};
			ref.channel = {
				prefetch: jest.fn(),
				on: jest.fn((event, cb) => {
					channelOnCallbacks[event] = cb;
					return ref.channel;
				}),
				unbindQueue: jest.fn(() => Promise.resolve()),
				bindQueue: jest.fn(() => Promise.resolve()),
				assertExchange: jest.fn(() => Promise.resolve()),
				assertQueue: jest.fn(() => Promise.resolve()),
				consume: jest.fn(() => Promise.resolve()),
				close: jest.fn(() => Promise.resolve()),

				publish: jest.fn(),
				ack: jest.fn(),
				sendToQueue: jest.fn(),
				channelOnCallbacks,
			};

			return Promise.resolve(ref.channel);
		}),
	};
	return Promise.resolve(ref.connection);
});

const AmqpTransporter = require("../../../src/transporters/amqp");


describe("Test AmqpTransporter constructor", () => {

	it("check constructor with string param", () => {
		let transporter = new AmqpTransporter("amqp://localhost");
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({
			amqp: {
				url: "amqp://localhost",
				prefetch: 1,
				eventTimeToLive: 5000,
				exchangeOptions: {},
				messageOptions: {},
				queueOptions: {},
				consumeOptions: {}
			}
		});
		expect(transporter.connected).toBe(false);
		expect(transporter.channel).toBeNull();
		expect(transporter.connection).toBeNull();
		expect(transporter.bindings).toHaveLength(0);
	});

	it("check constructor with options", () => {
		let opts = {
			amqp: {
				url: "amqp://localhost",
				prefetch: 3,
				eventTimeToLive: 10000,
				exchangeOptions: { alternateExchange: "retry" },
				messageOptions: { expiration: 120000, persistent: true, mandatory: true },
				queueOptions: { deadLetterExchange: "dlx", maxLength: 100 },
				consumeOptions: { priority: 5 }
			},
		};
		let transporter = new AmqpTransporter(opts);
		expect(transporter.opts).toEqual(opts);
	});
});

describe("Test AmqpTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new AmqpTransporter({ amqp: { url: "amqp://localhost", prefetch: 3 } });
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		return transporter.connect().then(() => {
			expect(transporter.connection).toBeDefined();
			expect(transporter.connection.on).toHaveBeenCalledTimes(4);
			expect(transporter.connection.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.connection.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(transporter.connection.on).toHaveBeenCalledWith("blocked", jasmine.any(Function));
			expect(transporter.connection.on).toHaveBeenCalledWith("unblocked", jasmine.any(Function));
			expect(transporter.channel).toBeDefined();
			expect(transporter.channel.on).toHaveBeenCalledTimes(4);
			expect(transporter.channel.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.channel.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(transporter.channel.on).toHaveBeenCalledWith("return", jasmine.any(Function));
			expect(transporter.channel.on).toHaveBeenCalledWith("drain", jasmine.any(Function));
			expect(transporter.channel.prefetch).toHaveBeenCalledTimes(1);
			expect(transporter.channel.prefetch).toHaveBeenCalledWith(3);
		});
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		return transporter.connect().then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});
	});

	it("check disconnect", () => {
		transporter.bindings = [["queue1", "exchange1", ""], ["queue2", "exchange2", ""]];
		return transporter.connect().then(() => {
			let chanCloseCb = transporter.channel.close;
			let chanUnbindCb = transporter.channel.unbindQueue;
			let conCloseCb = transporter.connection.close;
			let bindings = transporter.bindings;
			transporter.disconnect()
				.then(() => {
					expect(transporter.channel).toBeNull();
					expect(transporter.connection).toBeNull();
					expect(chanCloseCb).toHaveBeenCalledTimes(1);
					expect(conCloseCb).toHaveBeenCalledTimes(1);

					expect(chanUnbindCb).toHaveBeenCalledTimes(bindings.length);
					for (let binding of bindings) {
						expect(chanUnbindCb).toHaveBeenCalledWith(...binding);
					}
				});
		});
	});
});

describe("Test AmqpTransporter subscribe", () => {
	let transporter;
	let msgHandler;
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({ namespace: "TEST", nodeID: "node", internalServices: false });
		msgHandler = jest.fn();
		transporter = new AmqpTransporter({ amqp: { url: "amqp://localhost", eventTimeToLive: 3000 }});
		transporter.init(new Transit(broker), msgHandler);
		return transporter.connect();
	});

	it("check RES subscription", () => {
		return transporter.subscribe("RES", "node")
			.then(() => {
				expect(transporter.channel.assertQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.consume).toHaveBeenCalledTimes(1);
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.RES.node", {});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.RES.node", jasmine.any(Function), { noAck: true });

				const consumeCb = transporter.channel.consume.mock.calls[0][1];
				consumeCb({ content: Buffer.from("data") });

				expect(msgHandler).toHaveBeenCalledTimes(1);
				expect(transporter.channel.ack).toHaveBeenCalledTimes(0);
			});
	});

	it("check INFO.nodeID subscription", () => {
		transporter.getTopicName = () => "MOL-TEST.INFO.node";
		return transporter.subscribe("INFO", "node")
			.then(() => {
				expect(transporter.channel.assertQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.consume).toHaveBeenCalledTimes(1);
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.INFO.node", {"autoDelete": true, "messageTtl": 5000});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.INFO.node", jasmine.any(Function), { noAck: true });

				const consumeCb = transporter.channel.consume.mock.calls[0][1];
				consumeCb({ content: Buffer.from("data") });

				expect(msgHandler).toHaveBeenCalledTimes(1);
				expect(transporter.channel.ack).toHaveBeenCalledTimes(0);
			});
	});

	it("check REQ subscription", () => {
		const mockServices = [
			{ name: "empty" },
			{
				name: "example1",
				actions: {
					"example1.testing": {},
					"example1.hello": {},
				}
			},
			{
				name: "example2",
				actions: { "example2.world": {} },
				events: {
					"user.created": {},
					"payment.done": {}
				}
			}
		];
		transporter.transit.broker.registry.getLocalNodeInfo = jest.fn(() => ({
			services: mockServices
		}));

		return transporter._makeServiceSpecificSubscriptions()
			.then(() => {
				expect(transporter.transit.broker.registry.getLocalNodeInfo).toHaveBeenCalledTimes(1);

				expect(transporter.channel.assertQueue).toHaveBeenCalledTimes(5);
				expect(transporter.channel.consume).toHaveBeenCalledTimes(5);
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example2.world", {});
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example1.hello", {});
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example1.testing", {});

				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.EVENT.example2.user.created", {});
				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.EVENT.example2.payment.done", {});

				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example2.world", jasmine.any(Function), {});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example1.hello", jasmine.any(Function), {});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.REQ.example1.testing", jasmine.any(Function), {});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.EVENT.example2.user.created", jasmine.any(Function), {});
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith("MOL-TEST.EVENT.example2.payment.done", jasmine.any(Function), {});

				const consumeCb = transporter.channel.consume.mock.calls[0][1];
				consumeCb({ content: Buffer.from("data") });

				expect(msgHandler).toHaveBeenCalledTimes(1);
				expect(transporter.channel.ack).toHaveBeenCalledTimes(1);
			});
	});

	it("check EVENT subscription", () => {
		return transporter.subscribe("EVENT", "node")
			.then(() => {
				expect(transporter.channel.assertQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.assertExchange).toHaveBeenCalledTimes(0);
				expect(transporter.channel.bindQueue).toHaveBeenCalledTimes(0);
				expect(transporter.channel.consume).toHaveBeenCalledTimes(1);

				expect(transporter.channel.assertQueue)
					.toHaveBeenCalledWith("MOL-TEST.EVENT.node", { autoDelete: true, messageTtl: 3000 }); // use ttl option
				//expect(transporter.channel.assertExchange)
				//	.toHaveBeenCalledWith("MOL-TEST.EVENT", "fanout", {});
				//expect(transporter.channel.bindQueue)
				//	.toHaveBeenCalledWith("MOL-TEST.EVENT.node", "MOL-TEST.EVENT", "");
				expect(transporter.channel.consume)
					.toHaveBeenCalledWith(
						"MOL-TEST.EVENT.node",
						jasmine.any(Function),
						{ noAck: true }
					);

				const consumeCb = transporter.channel.consume.mock.calls[0][1];
				consumeCb({ content: Buffer.from("data") });

				expect(msgHandler).toHaveBeenCalledTimes(1);
				expect(transporter.channel.ack).toHaveBeenCalledTimes(0);
			});
	});

	["DISCOVER", "DISCONNECT", "INFO", "HEARTBEAT"].forEach(type => {
		it(`check ${type} subscription`, () => {
			return transporter.subscribe(type)
				.then(() => {
					expect(transporter.channel.assertQueue).toHaveBeenCalledTimes(1);
					expect(transporter.channel.assertExchange).toHaveBeenCalledTimes(1);
					expect(transporter.channel.bindQueue).toHaveBeenCalledTimes(1);
					expect(transporter.channel.consume).toHaveBeenCalledTimes(1);

					expect(transporter.channel.assertQueue)
						.toHaveBeenCalledWith(`MOL-TEST.${type}.node`, { autoDelete: true, messageTtl: 5000 });
					expect(transporter.channel.assertExchange)
						.toHaveBeenCalledWith(`MOL-TEST.${type}`, "fanout", {});
					expect(transporter.channel.bindQueue)
						.toHaveBeenCalledWith(`MOL-TEST.${type}.node`, `MOL-TEST.${type}`, "");
					expect(transporter.channel.consume)
						.toHaveBeenCalledWith(
							`MOL-TEST.${type}.node`,
							jasmine.any(Function),
							{ noAck: true }
						);

					const consumeCb = transporter.channel.consume.mock.calls[0][1];
					consumeCb({ content: Buffer.from("data") });

					expect(msgHandler).toHaveBeenCalledTimes(1);
					expect(transporter.channel.ack).toHaveBeenCalledTimes(0);
				});
		});
	});
});

describe("Test AmqpTransporter publish", () => {
	let transporter;
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new AmqpTransporter({ amqp: { url: "amqp://localhost", eventTimeToLive: 3000 }});
		transporter.init(new Transit(new ServiceBroker({ namespace: "TEST" })), msgHandler);
		return transporter.connect();
	});

	it("check INFO.node publish", () => {
		const packet = new PacketInfo(fakeTransit, "node2", {});
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.sendToQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.INFO.node2",
					Buffer.from(JSON.stringify({"ver": "2", "sender": "node1"})),
					{}
				);
			});
	});

	// The following tests mock a packet for ease of testing.
	it("check REQ publish", () => {
		transporter.getTopicName = () => `${transporter.prefix}.REQ`;
		const packet = {
			type: "REQ",
			target: "node-2",
			serialize: () => JSON.stringify({ fake: "payload" }),
			payload: {
				action: "echo"
			}
		};
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.sendToQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.REQ.echo",
					Buffer.from(packet.serialize()),
					{}
				);
			});
	});

	it("check RES publish", () => {
		transporter.getTopicName = () => `${transporter.prefix}.RES.node`;
		const packet = {
			type: "RES",
			target: "node-2",
			serialize: () => JSON.stringify({ fake: "payload" }),
		};
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.sendToQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.RES.node",
					Buffer.from(packet.serialize()),
					{}
				);
			});
	});

	["DISCOVER", "HEARTBEAT", "DISCONNECT"].forEach((type) => {
		it(`check ${type} publish`, () => {
			transporter.getTopicName = () => `${transporter.prefix}.${type}.node`;
			const packet = {
				type,
				serialize: () => JSON.stringify({ fake: "payload" }),
			};
			return transporter.publish(packet)
				.then(() => {
					expect(transporter.channel.publish).toHaveBeenCalledTimes(1);
					expect(transporter.channel.publish).toHaveBeenCalledWith(
						`MOL-TEST.${type}.node`,
						"",
						Buffer.from(packet.serialize()),
						{}
					);
				});
		});
	});

	it("check grouped EVENT publish", () => {
		const packet = {
			type: "EVENT",
			target: "node-2",
			serialize: () => JSON.stringify({ fake: "payload" }),
			payload: {
				event: "user.created",
				groups: ["users", "payments"]
			}
		};
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.sendToQueue).toHaveBeenCalledTimes(2);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.EVENT.users.user.created",
					Buffer.from(packet.serialize()),
					{}
				);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.EVENT.payments.user.created",
					Buffer.from(packet.serialize()),
					{}
				);
			});
	});

	it("check broadcast EVENT publish", () => {
		const packet = {
			type: "EVENT",
			target: "node-2",
			serialize: () => JSON.stringify({ fake: "payload" }),
			payload: {
				event: "user.created",
				groups: null
			}
		};
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.sendToQueue).toHaveBeenCalledTimes(1);
				expect(transporter.channel.sendToQueue).toHaveBeenCalledWith(
					"MOL-TEST.EVENT.node-2",
					Buffer.from(packet.serialize()),
					{}
				);

			});
	});

	it("check INFO publish", () => {
		transporter.getTopicName = () => `${transporter.prefix}.INFO`;
		transporter._makeServiceSpecificSubscriptions = jest.fn(() => Promise.resolve());
		const mockServices = [
			{ schema: { name: "empty" } },
			{
				schema: {
					name: "example1",
					actions: {
						testing: {},
						hello: {},
					}
				}
			},
			{
				schema: {
					name: "example2",
					actions: { world: {} },
					events: {
						"user.created": {},
						"payment.done": {}
					}
				}
			}
		];
		const packet = {
			type: "INFO",
			serialize: () => JSON.stringify({ fake: "payload" }),
			transit: {
				broker: {
					services: mockServices
				}
			}
		};
		return transporter.publish(packet)
			.then(() => {
				expect(transporter.channel.publish).toHaveBeenCalledTimes(1);
				expect(transporter.channel.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO",
					"",
					Buffer.from(packet.serialize()),
					{}
				);

				expect(transporter._makeServiceSpecificSubscriptions).toHaveBeenCalledTimes(1);
			});
	});
});
