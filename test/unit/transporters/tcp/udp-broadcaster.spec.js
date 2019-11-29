"use strict";

const ServiceBroker = require("../../../../src/service-broker");
const { protectReject } = require("../../utils");

const lolex = require("lolex");

const os = require("os");

const dgram = require("dgram");
jest.mock("dgram");

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

		expect(udp.servers).toEqual([]);
		expect(udp.discoverTimer).toBeNull();

		expect(udp.nodeID).toBe("node-1");
		expect(udp.namespace).toBe("test");
	});

});

describe("Test UdpServer.startServer", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
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
			setMulticastTTL: jest.fn(),
			setMulticastInterface: jest.fn()
		};
	});

	it("should bind UDP with broadcast", () => {
		udp = new UdpServer(transporter, { udpReuseAddr: true });
		udp.getBroadcastAddresses = jest.fn(() => (["192.168.100.255", "192.168.200.255"]));

		return udp.startServer("127.0.0.1", 4567).catch(protectReject).then(() => {
			expect(udp.servers.length).toBe(1);
			const server = udp.servers[0];

			expect(dgram.createSocket).toHaveBeenCalledTimes(1);
			expect(dgram.createSocket).toHaveBeenCalledWith({ "reuseAddr": true, "type": "udp4" });

			expect(server.bind).toHaveBeenCalledTimes(1);
			expect(server.bind).toHaveBeenCalledWith({ "exclusive": true, "host": "127.0.0.1", "port": 4567 }, jasmine.any(Function));

			expect(server.on).toHaveBeenCalledTimes(2);
			expect(server.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(server.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(server.setBroadcast).toHaveBeenCalledTimes(1);
			expect(server.setBroadcast).toHaveBeenCalledWith(true);

			expect(server.destinations).toEqual(["192.168.100.255", "192.168.200.255"]);

			expect(udp.getBroadcastAddresses).toHaveBeenCalledTimes(1);
		});
	});

	it("should bind UDP with multicast", () => {
		dgram.createSocket.mockClear();

		udp = new UdpServer(transporter, { udpReuseAddr: true });

		return udp.startServer("10.0.0.4", 4567, "239.0.0.2", 2).catch(protectReject).then(() => {
			expect(udp.servers.length).toBe(1);
			const server = udp.servers[0];

			expect(dgram.createSocket).toHaveBeenCalledTimes(1);
			expect(dgram.createSocket).toHaveBeenCalledWith({ "reuseAddr": true, "type": "udp4" });

			expect(server.bind).toHaveBeenCalledTimes(1);
			expect(server.bind).toHaveBeenCalledWith({ "exclusive": true, "host": "10.0.0.4", "port": 4567 }, jasmine.any(Function));

			expect(server.on).toHaveBeenCalledTimes(2);
			expect(server.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(server.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(server.addMembership).toHaveBeenCalledTimes(1);
			expect(server.addMembership).toHaveBeenCalledWith("239.0.0.2", "10.0.0.4");

			expect(server.setMulticastTTL).toHaveBeenCalledTimes(1);
			expect(server.setMulticastTTL).toHaveBeenCalledWith(2);

			expect(server.setMulticastInterface).toHaveBeenCalledTimes(1);
			expect(server.setMulticastInterface).toHaveBeenCalledWith("10.0.0.4");

			expect(server.destinations).toEqual(["239.0.0.2"]);

		});
	});

	it("should not reject bind when server throws error", () => {
		let err = new Error("Server error");
		dgram.createSocket = jest.fn(() => {
			let callbacks = {};
			return {
				bind: jest.fn(() => callbacks.error(err)),
				on: jest.fn((name, cb) => callbacks[name] = cb),
				__callbacks: callbacks,
			};
		});

		udp = new UdpServer(transporter, {
			udpMulticast: "230.0.0.2",
			udpPort: 4545,
			udpMulticastTTL: 2,
			udpReuseAddr: true
		});

		return udp.startServer("127.0.0.1", 4567).catch(protectReject).then(() => {
			expect(udp.servers.length).toBe(0);
		});

	});

});

describe("Test UdpServer.bind", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
	let transporter = broker.transit.tx;
	let udp;

	let clock;
	beforeAll(() => clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should not call startServer", () => {
		udp = new UdpServer(transporter, { udpBindAddress: "192.168.0.100", udpPort: 4445, udpReuseAddr: true, udpMulticast: null, udpMulticastTTL: 2 });
		udp.startServer = jest.fn();
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();
		udp.getInterfaceAddresses = jest.fn(() => (["192.168.100.100", "192.168.200.200"]));

		return udp.bind().catch(protectReject).then(() => {
			expect(udp.startServer).toHaveBeenCalledTimes(0);
			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
		});
	});

	it("should call startServer for broadcast", () => {
		udp = new UdpServer(transporter, { udpBindAddress: "192.168.0.100", udpPort: 4445, udpReuseAddr: true, udpBroadcast: true, udpMulticast: null });
		udp.startServer = jest.fn(() => udp.servers.push({}));
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();
		udp.getInterfaceAddresses = jest.fn(() => (["192.168.100.100", "192.168.200.200"]));

		return udp.bind().catch(protectReject).then(() => {
			expect(udp.startServer).toHaveBeenCalledTimes(1);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.0.100", 4445);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
		});
	});

	it("should call startServer for multicast once", () => {
		udp = new UdpServer(transporter, { udpBindAddress: "192.168.0.100", udpPort: 4445, udpReuseAddr: true, udpBroadcast: false, udpMulticast: "239.0.0.1", udpMulticastTTL: 2 });
		udp.startServer = jest.fn(() => udp.servers.push({}));
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();
		udp.getInterfaceAddresses = jest.fn(() => (["192.168.100.100", "192.168.200.200"]));

		return udp.bind().catch(protectReject).then(() => {

			expect(udp.startServer).toHaveBeenCalledTimes(1);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.0.100", 4445, "239.0.0.1", 2);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
		});
	});

	it("should call startServer for multicast twice", () => {
		udp = new UdpServer(transporter, { udpPort: 4445, udpReuseAddr: true, udpBroadcast: false, udpMulticast: "239.0.0.1", udpMulticastTTL: 2 });
		udp.startServer = jest.fn(() => udp.servers.push({}));
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();
		udp.getInterfaceAddresses = jest.fn(() => (["192.168.100.100", "192.168.200.200"]));

		return udp.bind().catch(protectReject).then(() => {

			expect(udp.startServer).toHaveBeenCalledTimes(2);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.100.100", 4445, "239.0.0.1", 2);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.200.200", 4445, "239.0.0.1", 2);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
			expect(udp.discover).toHaveBeenCalledTimes(0);

			clock.tick(1600);
			expect(udp.discover).toHaveBeenCalledTimes(1);

		});
	});

	it("should call startServer for multicast & broadcast", () => {
		udp = new UdpServer(transporter, { udpPort: 4445, udpReuseAddr: true, udpBroadcast: true, udpMulticast: "239.0.0.1", udpMulticastTTL: 2 });
		udp.startServer = jest.fn(() => udp.servers.push({}));
		udp.discover = jest.fn();
		udp.startDiscovering = jest.fn();
		udp.getInterfaceAddresses = jest.fn(() => (["192.168.100.100", "192.168.200.200"]));

		return udp.bind().catch(protectReject).then(() => {

			expect(udp.startServer).toHaveBeenCalledTimes(3);
			expect(udp.startServer).toHaveBeenCalledWith(undefined, 4445);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.100.100", 4445, "239.0.0.1", 2);
			expect(udp.startServer).toHaveBeenCalledWith("192.168.200.200", 4445, "239.0.0.1", 2);

			expect(udp.startDiscovering).toHaveBeenCalledTimes(1);
			expect(udp.discover).toHaveBeenCalledTimes(0);

			clock.tick(1600);
			expect(udp.discover).toHaveBeenCalledTimes(1);

		});
	});

	it("should not discovering", () => {
		dgram.createSocket = jest.fn();

		udp = new UdpServer(transporter, {
			udpDiscovery: false
		});
		udp.startServer = jest.fn(() => udp.servers.push({}));

		return udp.bind().catch(protectReject).then(() => {
			expect(udp.servers.length).toBe(0);
			expect(udp.startServer).toHaveBeenCalledTimes(0);
		});

	});
});

describe("Test UdpServer.discover", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
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

		udp = new UdpServer(transporter, { port: 1234 });
	});

	it("should send broadcast message", () => {
		udp.servers = [
			{
				destinations: ["192.168.100.255", "192.168.200.255"],
				send: jest.fn((msg, port, host, cb) => cb())
			},
			{
				destinations: ["239.0.0.2"],
				send: jest.fn((msg, port, host, cb) => cb())
			}
		];

		udp.discover();

		expect(udp.servers[0].send).toHaveBeenCalledTimes(2);
		expect(udp.servers[0].send).toHaveBeenCalledWith(Buffer.from("test|node-1|1234"), 4445, "192.168.100.255", jasmine.any(Function));
		expect(udp.servers[0].send).toHaveBeenCalledWith(Buffer.from("test|node-1|1234"), 4445, "192.168.200.255", jasmine.any(Function));

		expect(udp.servers[1].send).toHaveBeenCalledTimes(1);
		expect(udp.servers[1].send).toHaveBeenCalledWith(Buffer.from("test|node-1|1234"), 4445, "239.0.0.2", jasmine.any(Function));
	});
});

describe("Test UdpServer.onMessage", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
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

	it("should not emit message if message is malformed (2 parts)", () => {
		udp.emit = jest.fn();

		let rinfo = {
			address: "192.168.0.100"
		};
		udp.onMessage(Buffer.from("test|node-1"), rinfo);

		expect(udp.emit).toHaveBeenCalledTimes(0);
	});

	it("should not emit message if message is malformed (4 parts)", () => {
		udp.emit = jest.fn();

		let rinfo = {
			address: "192.168.0.100"
		};
		udp.onMessage(Buffer.from("test|node-1|a|b"), rinfo);

		expect(udp.emit).toHaveBeenCalledTimes(0);
	});
});

describe("Test UdpServer.startDiscovering & stopDiscovering", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
	let transporter = broker.transit.tx;
	let udp;

	let clock;
	beforeAll(() => {
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

		clock = lolex.install();
		udp = new UdpServer(transporter, { udpReuseAddr: true, udpPeriod: 1 });
		udp.discover = jest.fn();
		return udp.bind();
	});

	afterAll(() => clock.uninstall());

	it("should create timer", () => {
		udp.discoverTimer = null;

		udp.startDiscovering();

		expect(udp.discoverTimer).toBeDefined();
		expect(udp.discover).toHaveBeenCalledTimes(0);
		udp.discover.mockClear();

		clock.next();

		expect(udp.discover).toHaveBeenCalledTimes(1);

		udp.stopDiscovering();

		expect(udp.discoverTimer).toBeNull();
		// udp.discover.mockClear();

		// clock.next();

		// expect(udp.discover).toHaveBeenCalledTimes(0);
	});

});

describe("Test UdpServer.close", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "test", nodeID: "node-1", transporter: "Fake" });
	let transporter = broker.transit.tx;
	let udp;

	beforeAll(() => {
		udp = new UdpServer(transporter, { udpReuseAddr: true, udpPeriod: 1 });
		udp.discover = jest.fn();
	});

	it("should close udp server", () => {
		let server = {
			close: jest.fn()
		};
		udp.servers = [server, server];
		udp.stopDiscovering = jest.fn();

		udp.close();

		expect(udp.stopDiscovering).toHaveBeenCalledTimes(1);
		expect(server.close).toHaveBeenCalledTimes(2);
		expect(udp.servers.length).toBe(0);
	});

});

describe("Test UdpServer getBroadcastAddresses", () => {
	os.networkInterfaces = jest.fn(() => ({
		"Local": [
			{
				address: "fe80::29a9:ffeb:4a65:9f82",
				netmask: "ffff:ffff:ffff:ffff::",
				family: "IPv6",
				internal: false,
				cidr: "fe80::29a9:ffeb:4a65:9f82/64"
			},
			{ address: "192.168.2.100",
				netmask: "255.255.255.0",
				family: "IPv4",
				internal: false,
				cidr: "192.168.2.100/24"
			}
		],
		"Loopback Pseudo-Interface 1": [
			{
				address: "::1",
				netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
				family: "IPv6",
				internal: true,
				cidr: "::1/128"
			},
			{
				address: "127.0.0.1",
				netmask: "255.0.0.0",
				family: "IPv4",
				internal: true,
				cidr: "127.0.0.1/8"
			}
		],
		"VMware Network Adapter VMnet1": [
			{
				address: "fe80::3c63:fab8:e6be:8059",
				netmask: "ffff:ffff:ffff:ffff::",
				family: "IPv6",
				internal: false,
				cidr: "fe80::3c63:fab8:e6be:8059/64"
			},
			{
				address: "192.168.232.1",
				netmask: "255.255.255.0",
				family: "IPv4",
				internal: false,
				cidr: "192.168.232.1/24"
			}
		]
	}));

	it("check constructor", () => {
		let transporter = {
			nodeID: "node-1",
			logger: jest.fn(),
			broker: {
				namespace: "test"
			}
		};
		let udp = new UdpServer(transporter);
		expect(udp.getBroadcastAddresses()).toEqual(["192.168.2.255", "192.168.232.255"]);
	});

});

describe("Test UdpServer getInterfaceAddresses", () => {
	os.networkInterfaces = jest.fn(() => ({
		"Local": [
			{
				address: "fe80::29a9:ffeb:4a65:9f82",
				netmask: "ffff:ffff:ffff:ffff::",
				family: "IPv6",
				internal: false,
				cidr: "fe80::29a9:ffeb:4a65:9f82/64"
			},
			{ address: "192.168.2.100",
				netmask: "255.255.255.0",
				family: "IPv4",
				internal: false,
				cidr: "192.168.2.100/24"
			}
		],
		"Loopback Pseudo-Interface 1": [
			{
				address: "::1",
				netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
				family: "IPv6",
				internal: true,
				cidr: "::1/128"
			},
			{
				address: "127.0.0.1",
				netmask: "255.0.0.0",
				family: "IPv4",
				internal: true,
				cidr: "127.0.0.1/8"
			}
		],
		"VMware Network Adapter VMnet1": [
			{
				address: "fe80::3c63:fab8:e6be:8059",
				netmask: "ffff:ffff:ffff:ffff::",
				family: "IPv6",
				internal: false,
				cidr: "fe80::3c63:fab8:e6be:8059/64"
			},
			{
				address: "192.168.232.1",
				netmask: "255.255.255.0",
				family: "IPv4",
				internal: false,
				cidr: "192.168.232.1/24"
			}
		]
	}));

	it("check constructor", () => {
		let transporter = {
			nodeID: "node-1",
			logger: jest.fn(),
			broker: {
				namespace: "test"
			}
		};
		let udp = new UdpServer(transporter);
		expect(udp.getInterfaceAddresses()).toEqual(["192.168.2.100", "192.168.232.1"]);
	});

});

