const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const P = require("../../../src/packets");
const BaseTransporter = require("../../../src/transporters/base");
const { protectReject } = require("../utils");


describe("Test BaseTransporter", () => {

	it("check constructor", () => {
		let transporter = new BaseTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toBeUndefined();
		expect(transporter.connected).toBe(false);
		expect(transporter.hasBuiltInBalancer).toBe(false);

		expect(transporter.init).toBeDefined();
		expect(transporter.connect).toBeDefined();
		expect(transporter.onConnected).toBeDefined();
		expect(transporter.disconnect).toBeDefined();
		expect(transporter.subscribe).toBeDefined();
		expect(transporter.subscribeBalancedRequest).toBeDefined();
		expect(transporter.subscribeBalancedEvent).toBeDefined();
		expect(transporter.unsubscribeFromBalancedCommands).toBeDefined();
		expect(transporter.prepublish).toBeDefined();
		expect(transporter.publish).toBeDefined();
		expect(transporter.publishBalancedEvent).toBeDefined();
		expect(transporter.publishBalancedRequest).toBeDefined();
		expect(transporter.serialize).toBeDefined();
		expect(transporter.deserialize).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = {};
		let transporter = new BaseTransporter(opts);
		expect(transporter).toBeDefined();
		expect(transporter.opts).toBe(opts);
	});

	it("check init", () => {
		let broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		let transporter = new BaseTransporter();
		let transit = new Transit(broker, transporter);
		let handler = jest.fn();
		let handler2 = jest.fn();

		transporter.init(transit, handler, handler2);
		expect(transporter.transit).toBe(transit);
		expect(transporter.broker).toBe(broker);
		expect(transporter.nodeID).toBe("server1");
		expect(transporter.prefix).toBe("MOL-beta-test");
		expect(transporter.logger).toBeDefined();
		expect(transporter.messageHandler).toBe(handler);
		expect(transporter.afterConnect).toBe(handler2);
	});

	it("check onConnected", () => {
		let transporter = new BaseTransporter();
		let afterConnect = jest.fn();

		expect(transporter.connected).toBe(false);

		transporter.init(null, null, afterConnect);

		transporter.onConnected();
		expect(transporter.connected).toBe(true);
		expect(afterConnect).toHaveBeenCalledTimes(1);

		afterConnect.mockClear();
		transporter.onConnected(true);
		expect(afterConnect).toHaveBeenCalledTimes(1);
		expect(afterConnect).toHaveBeenCalledWith(true);
	});

	it("check incomingMessage", () => {
		let transporter = new BaseTransporter();
		let p = {};
		transporter.deserialize = jest.fn(() => p);
		transporter.messageHandler = jest.fn();

		transporter.incomingMessage("MOL.DISCOVER" , "msg");

		expect(transporter.deserialize).toHaveBeenCalledTimes(1);
		expect(transporter.deserialize).toHaveBeenCalledWith("MOL.DISCOVER", "msg");

		expect(transporter.messageHandler).toHaveBeenCalledTimes(1);
		expect(transporter.messageHandler).toHaveBeenCalledWith("MOL.DISCOVER", p);
	});

	it("check getTopicName", () => {
		let broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		let transporter = new BaseTransporter();
		new Transit(broker, transporter);

		expect(transporter.getTopicName("REQ")).toBe("MOL-beta-test.REQ");
		expect(transporter.getTopicName("REQ", "server-2")).toBe("MOL-beta-test.REQ.server-2");
	});

	it("should call subscribe with all topics", () => {
		let broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		let transporter = new BaseTransporter();
		new Transit(broker, transporter);
		transporter.subscribe = jest.fn(() => Promise.resolve());

		return transporter.makeSubscriptions([
			{ cmd: P.PACKET_DISCOVER },
			{ cmd: P.PACKET_DISCOVER, nodeID: "node1" },
		]).catch(protectReject).then(() => {
			expect(transporter.subscribe).toHaveBeenCalledTimes(2);
			expect(transporter.subscribe).toHaveBeenCalledWith("DISCOVER", undefined);
			expect(transporter.subscribe).toHaveBeenCalledWith("DISCOVER", "node1");
		});
	});

	it("check makeBalancedSubscriptions if hasBuiltInBalancer = FALSE", () => {
		let broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		let transporter = new BaseTransporter();
		new Transit(broker, transporter);
		transporter.hasBuiltInBalancer = false;

		transporter.unsubscribeFromBalancedCommands = jest.fn(() => Promise.resolve());
		broker.getLocalNodeInfo = jest.fn(() => ({ services: [
			{
				actions: {
					"posts.find": {},
					"posts.get": {}
				}
			},
			{
				name: "users",
				events: {
					"user.created": {},
					"user.updated": {}
				}
			},
			{
				// Empty
			}
		]}));

		transporter.subscribeBalancedEvent = jest.fn();
		transporter.subscribeBalancedRequest = jest.fn();

		return transporter.makeBalancedSubscriptions().catch(protectReject).then(() => {
			expect(transporter.unsubscribeFromBalancedCommands).toHaveBeenCalledTimes(0);
			expect(broker.getLocalNodeInfo).toHaveBeenCalledTimes(0);
			expect(transporter.subscribeBalancedRequest).toHaveBeenCalledTimes(0);
			expect(transporter.subscribeBalancedEvent).toHaveBeenCalledTimes(0);
		});
	});

	it("check makeBalancedSubscriptions if hasBuiltInBalancer = TRUE", () => {
		let broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		let transporter = new BaseTransporter();
		new Transit(broker, transporter);
		transporter.hasBuiltInBalancer = true;

		transporter.unsubscribeFromBalancedCommands = jest.fn(() => Promise.resolve());
		broker.getLocalNodeInfo = jest.fn(() => ({ services: [
			{
				actions: {
					"posts.find": {},
					"posts.get": {}
				}
			},
			{
				name: "users",
				events: {
					"user.created": {},
					"user.updated": {}
				}
			},
			{
				// Empty
			}
		]}));

		transporter.subscribeBalancedEvent = jest.fn();
		transporter.subscribeBalancedRequest = jest.fn();

		return transporter.makeBalancedSubscriptions().catch(protectReject).then(() => {
			expect(transporter.unsubscribeFromBalancedCommands).toHaveBeenCalledTimes(1);

			expect(broker.getLocalNodeInfo).toHaveBeenCalledTimes(1);

			expect(transporter.subscribeBalancedRequest).toHaveBeenCalledTimes(2);
			expect(transporter.subscribeBalancedRequest).toHaveBeenCalledWith("posts.find");
			expect(transporter.subscribeBalancedRequest).toHaveBeenCalledWith("posts.get");

			expect(transporter.subscribeBalancedEvent).toHaveBeenCalledTimes(2);
			expect(transporter.subscribeBalancedEvent).toHaveBeenCalledWith("user.created", "users");
			expect(transporter.subscribeBalancedEvent).toHaveBeenCalledWith("user.updated", "users");
		});
	});

	describe("Test prepublish", () => {

		const broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		const transporter = new BaseTransporter();
		const transit = new Transit(broker, transporter);

		transporter.publish = jest.fn(() => Promise.resolve());
		transporter.publishBalancedEvent = jest.fn(() => Promise.resolve());
		transporter.publishBalancedRequest = jest.fn(() => Promise.resolve());

		it("check with PACKET_EVENT with target without groups", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedEvent.mockClear();

			let packet = new P.Packet(P.PACKET_EVENT, "server-2", { event: "user.created" });
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(1);
				expect(transporter.publishBalancedEvent).toHaveBeenCalledTimes(0);
			});
		});

		it("check with PACKET_EVENT with target with groups", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedEvent.mockClear();

			let packet = new P.Packet(P.PACKET_EVENT, "server-2", {
				event: "user.created",
				data: null,
				groups: ["users", "payments"]
			});
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(1);
				expect(transporter.publishBalancedEvent).toHaveBeenCalledTimes(0);
			});
		});

		it("check with PACKET_EVENT without target", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedEvent.mockClear();

			let packet = new P.Packet(P.PACKET_EVENT, null, "user.created");
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(1);
				expect(transporter.publishBalancedEvent).toHaveBeenCalledTimes(0);
			});
		});

		it("check with PACKET_EVENT with target with groups", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedEvent.mockClear();

			let packet = new P.Packet(P.PACKET_EVENT, null, {
				event: "user.created",
				data: null,
				groups: ["users", "payments"]
			});
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(0);
				expect(transporter.publishBalancedEvent).toHaveBeenCalledTimes(2);
			});
		});


		it("check with PACKET_REQ without target", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedRequest.mockClear();

			let packet = new P.Packet(P.PACKET_REQUEST, null);
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(0);
				expect(transporter.publishBalancedRequest).toHaveBeenCalledTimes(1);
			});
		});

		it("check with PACKET_REQ with target", () => {
			transporter.publish.mockClear();
			transporter.publishBalancedRequest.mockClear();

			let packet = new P.Packet(P.PACKET_REQUEST, "server-2");
			return transporter.prepublish(packet).catch(protectReject).then(() => {
				expect(transporter.publish).toHaveBeenCalledTimes(1);
				expect(transporter.publishBalancedRequest).toHaveBeenCalledTimes(0);
			});
		});
	});

	describe("Test serialize", () => {
		const broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		const transporter = new BaseTransporter();
		new Transit(broker, transporter);

		broker.serializer.serialize = jest.fn(() => "serialized");

		it("should set ver & sender in payload", () => {

			let packet = new P.Packet(P.PACKET_EVENT);
			expect(transporter.serialize(packet)).toBe("serialized");
			expect(broker.serializer.serialize).toHaveBeenCalledTimes(1);
			expect(broker.serializer.serialize).toHaveBeenCalledWith({"sender": "server1", "ver": "3"}, P.PACKET_EVENT);
		});
	});

	describe("Test deserialize", () => {
		const broker = new ServiceBroker({ namespace: "beta-test", nodeID: "server1" });
		const transporter = new BaseTransporter();
		new Transit(broker, transporter);

		broker.serializer.deserialize = jest.fn(() => ({ type: P.PACKET_INFO, msg: "deserialized" }));

		it("should call deserialize", () => {
			const msg = "incoming data";
			let packet = transporter.deserialize(P.PACKET_INFO, msg);
			expect(packet).toBeDefined();
			expect(packet.type).toBe("INFO");
			expect(packet.payload).toEqual({"msg": "deserialized", "type": "INFO"});
			expect(broker.serializer.deserialize).toHaveBeenCalledTimes(1);
			expect(broker.serializer.deserialize).toHaveBeenCalledWith("incoming data", P.PACKET_INFO);
		});
	});

});
