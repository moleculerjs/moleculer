const ServiceBroker = require("../../../../src/service-broker");
const P = require("../../../../src/packets");
const E = require("../../../../src/errors");
const { protectReject } = require("../../utils");
const C = require("../../../../src/transporters/tcp/constants");

const lolex = require("lolex");

jest.mock("dgram");

const dgram = require("dgram");

const UdpServer = require("../../../../src/transporters/tcp/udp-broadcaster");

describe("Test UdpServer constructor", () => {

	it("check constructor", () => {
		let transporter = {
			nodeID: "node-1",
			logger: jest.fn(),
			broker: {
				namespace: "test"
			}
		};
		let opts = { port: 1234 };
		let udp = new UdpServer(transporter, opts);
		expect(udp).toBeDefined();
		expect(udp.transporter).toBe(transporter);
		expect(udp.opts).toBe(opts);

		expect(udp.server).toBeNull();
		expect(udp.discoverTimer).toBeNull();

		expect(udp.nodeID).toBe("node-1");
		expect(udp.namespace).toBe("test");
	});

});
/*
describe("Test UdpServer.send", () => {
	const broker = new ServiceBroker();
	let transporter, writer;
	let node = {
		id: "node-2",
		port: 2222
	};

	let socket = {
		write: jest.fn((payload, cb) => cb()),
		unref: jest.fn()
	};

	beforeEach(() => {
		transporter = {
			connect: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		writer = new UdpServer(transporter, {});
		writer.connect = jest.fn(() => Promise.resolve(socket));
	});

	it("should call connect if no socket", () => {
		return writer.send("node-2", P.PACKET_REQUEST, Buffer.from("data")).catch(protectReject).error(err => {
			expect(writer.connect).toHaveBeenCalledTimes(1);
			expect(writer.connect).toHaveBeenCalledWith(node);
			expect(socket.lastUsed).toBeDefined();
		});
	});

	it("should reject error and call removeSocket if write throw error", () => {
		writer.removeSocket = jest.fn();
		socket.write = jest.fn(() => { throw new Error("Write error"); });
		return writer.send("node-2", P.PACKET_REQUEST, Buffer.from("data")).then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(Error);

			expect(writer.removeSocket).toHaveBeenCalledTimes(1);
			expect(writer.removeSocket).toHaveBeenCalledWith("node-2");
		});
	});

	it("should not call connect & call write", () => {
		socket.write = jest.fn((data, cb) => cb());
		writer.sockets.set("node-2", socket);
		writer.connect.mockClear();

		return writer.send("node-2", C.PACKET_GOSSIP_REQ_ID, Buffer.from("data")).catch(protectReject).then(() => {
			expect(writer.connect).toHaveBeenCalledTimes(0);

			expect(socket.write).toHaveBeenCalledTimes(1);
			expect(socket.write).toHaveBeenCalledWith(Buffer.from([12, 0, 0, 0, 10, 6, 100, 97, 116, 97]), jasmine.any(Function));
		});
	});

});
*/

describe("Test UdpServer.bind", () => {
	const broker = new ServiceBroker({ namespace: "test", nodeID: "node-1", transporter: "Fake"});
	let transporter = broker.transit.tx;
	let udp;

	//let bindCB;
	dgram.createSocket = jest.fn(() => {
		let callbacks = {};
		return {
			bind: jest.fn((opts, cb) => cb()),
			on: jest.fn((name, cb) => callbacks[name] = cb),
			__callbacks: callbacks,
			setBroadcast: jest.fn(),
			addMembership: jest.fn(),
			setMulticastTTL: jest.fn()
		};
	});

	let clock;
	beforeAll(() => clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should bind UDP with broadcast", () => {
		udp = new UdpServer(transporter, { udpBindAddress: "127.0.0.1", udpReuseAddr: true });
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();

		return udp.bind().catch(protectReject).then(() => {
			expect(udp.server).toBeDefined();

			expect(dgram.createSocket).toHaveBeenCalledTimes(1);
			expect(dgram.createSocket).toHaveBeenCalledWith({"reuseAddr": true, "type": "udp4"});

			expect(udp.server.bind).toHaveBeenCalledTimes(1);
			expect(udp.server.bind).toHaveBeenCalledWith({"exclusive": true, "host": "127.0.0.1", "port": 4445}, jasmine.any(Function));

			expect(udp.server.on).toHaveBeenCalledTimes(2);
			expect(udp.server.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(udp.server.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(udp.server.setBroadcast).toHaveBeenCalledTimes(1);
			expect(udp.server.setBroadcast).toHaveBeenCalledWith(true);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
		});
	});

	it("should bind UDP with multicast", () => {
		dgram.createSocket.mockClear();

		udp = new UdpServer(transporter, {
			multicastHost: "230.0.0.2",
			multicastPort: 4545,
			multicastTTL: 2,
			udpReuseAddr: true
		});
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();

		return udp.bind().catch(protectReject).then(() => {
			expect(udp.server).toBeDefined();

			expect(dgram.createSocket).toHaveBeenCalledTimes(1);
			expect(dgram.createSocket).toHaveBeenCalledWith({"reuseAddr": true, "type": "udp4"});

			expect(udp.server.bind).toHaveBeenCalledTimes(1);
			expect(udp.server.bind).toHaveBeenCalledWith({"exclusive": true, "host": undefined, "port": 4545}, jasmine.any(Function));

			expect(udp.server.on).toHaveBeenCalledTimes(2);
			expect(udp.server.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(udp.server.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(udp.server.addMembership).toHaveBeenCalledTimes(1);
			expect(udp.server.addMembership).toHaveBeenCalledWith("230.0.0.2");

			expect(udp.server.setMulticastTTL).toHaveBeenCalledTimes(1);
			expect(udp.server.setMulticastTTL).toHaveBeenCalledWith(2);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
			expect(udp.discover).toHaveBeenCalledTimes(0);

			clock.tick(1100);
			expect(udp.discover).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test UdpServer.discover", () => {
	const broker = new ServiceBroker({ namespace: "test", nodeID: "node-1", transporter: "Fake"});
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
		udp = new UdpServer(transporter, { udpReuseAddr: true, multicastHost: "230.0.0.1", port: 1234 });
		return udp.bind();
	});

	it("should send broadcast message", () => {
		udp.server.send = jest.fn();

		udp.discover();
		expect(udp.server).toBeDefined();

		expect(udp.server.send).toHaveBeenCalledTimes(1);
		expect(udp.server.send).toHaveBeenCalledWith(Buffer.from("test|node-1|1234"), 4445, "230.0.0.1", jasmine.any(Function));
	});
});

describe("Test UdpServer.onMessage", () => {
	const broker = new ServiceBroker({ namespace: "test", nodeID: "node-1", transporter: "Fake"});
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
		udp = new UdpServer(transporter, { udpReuseAddr: true });
		udp.discover = jest.fn();
		return udp.bind();
	});

	it("should emit message if namespace is same", () => {
		udp.emit = jest.fn();

		let rinfo = {
			address: "192.168.0.100"
		};
		udp.onMessage(Buffer.from("test|node-1|1234"), rinfo);

		expect(udp.emit).toHaveBeenCalledTimes(1);
		expect(udp.emit).toHaveBeenCalledWith("message", "node-1", "192.168.0.100", 1234);
	});

	it("should not emit message if namespace mismatch", () => {
		udp.emit = jest.fn();

		let rinfo = {
			address: "192.168.0.100"
		};
		udp.onMessage(Buffer.from("prod|node-1|1234"), rinfo);

		expect(udp.emit).toHaveBeenCalledTimes(0);
	});
});

describe("Test UdpServer.startDiscovering & stopDiscovering", () => {
	const broker = new ServiceBroker({ namespace: "test", nodeID: "node-1", transporter: "Fake"});
	let transporter = broker.transit.tx;
	let udp;

	let clock;
	beforeAll(() => {
		clock = lolex.install();
		udp = new UdpServer(transporter, { udpReuseAddr: true, multicastPeriod: 1 });
		udp.discover = jest.fn();
		return udp.bind();
	});

	afterAll(() => clock.uninstall());

	it.skip("should create timer", () => {
		udp.discoverTimer = null;

		udp.startDiscovering();

		expect(udp.discoverTimer).toBeDefined();
		expect(udp.discover).toHaveBeenCalledTimes(0);
		udp.discover.mockClear();

		clock.next();

		expect(udp.discover).toHaveBeenCalledTimes(1);

		udp.stopDiscovering();

		expect(udp.discoverTimer).toBeNull();
		udp.discover.mockClear();

		clock.next();

		expect(udp.discover).toHaveBeenCalledTimes(0);
	});

});

describe("Test UdpServer.close", () => {
	const broker = new ServiceBroker({ namespace: "test", nodeID: "node-1", transporter: "Fake"});
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
		udp = new UdpServer(transporter, { udpReuseAddr: true, multicastPeriod: 1 });
		udp.discover = jest.fn();
	});

	it("should close udp server", () => {
		let server = {
			close: jest.fn()
		};
		udp.server = server;
		udp.stopDiscovering = jest.fn();

		udp.close();

		expect(udp.stopDiscovering).toHaveBeenCalledTimes(1);
		expect(server.close).toHaveBeenCalledTimes(1);
		expect(udp.server).toBeNull();
	});

});

