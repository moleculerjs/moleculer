"use strict";

const ServiceBroker = require("../../../../src/service-broker");
const P = require("../../../../src/packets");
const E = require("../../../../src/errors");
const { protectReject } = require("../../utils");
const C = require("../../../../src/transporters/tcp/constants");

// const lolex = require("lolex");
jest.mock("net");

const net = require("net");

const TcpWriter = require("../../../../src/transporters/tcp/tcp-writer");

describe("Test TcpWriter constructor", () => {

	it("check constructor", () => {
		let transporter = {
			logger: jest.fn()
		};
		let opts = { port: 1234 };
		let writer = new TcpWriter(transporter, opts);
		expect(writer).toBeDefined();
		expect(writer.transporter).toBe(transporter);
		expect(writer.opts).toBe(opts);

		expect(writer.sockets).toBeInstanceOf(Map);
		expect(writer.logger).toBe(transporter.logger);
	});

});

describe("Test TcpWriter.send", () => {
	const broker = new ServiceBroker({ logger: false });
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

		writer = new TcpWriter(transporter, {});
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

describe("Test TcpWriter.connect", () => {
	const broker = new ServiceBroker({ logger: false });
	let transporter, writer;
	let node = {
		id: "node-2",
		port: 2222
	};

	let socketCallbacks = {};
	let socket = {
		on: jest.fn((type, cb) => {
			socketCallbacks[type] = cb;
		}),
		unref: jest.fn(),
		setNoDelay: jest.fn()
	};

	let netConnectCB;
	net.connect = jest.fn((opts, cb) => {
		netConnectCB = cb;
		return socket;
	});

	beforeEach(() => {
		transporter = {
			getNode: jest.fn(() => null),
			getNodeAddress: jest.fn(() => "node-2-host"),
			sendHello: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		writer = new TcpWriter(transporter, {});
	});

	it("should reject error if no node info", () => {
		return writer.connect("node-2").then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(E.MoleculerError);
			expect(err.message).toBe("Missing node info for 'node-2'!");
		});
	});

	it("should connect & send sendHello", () => {
		writer.addSocket = jest.fn();
		transporter.getNode = jest.fn(() => node);
		transporter.sendHello = jest.fn(() => Promise.resolve());
		writer.manageConnections = jest.fn();
		writer.removeSocket = jest.fn();

		let p = writer.connect("node-2").catch(protectReject).then(s => {
			expect(socket).toBe(s);
			expect(socket.nodeID).toBe("node-2");
			expect(socket.lastUsed).toBeDefined();

			expect(socket.setNoDelay).toHaveBeenCalledTimes(1);
			expect(socket.setNoDelay).toHaveBeenCalledWith(true);

			expect(transporter.getNodeAddress).toHaveBeenCalledTimes(1);
			expect(transporter.getNodeAddress).toHaveBeenCalledWith(node);

			expect(writer.addSocket).toHaveBeenCalledTimes(1);
			expect(writer.addSocket).toHaveBeenCalledWith("node-2", socket, true);

			expect(transporter.sendHello).toHaveBeenCalledTimes(1);
			expect(transporter.sendHello).toHaveBeenCalledWith("node-2");

			expect(writer.manageConnections).toHaveBeenCalledTimes(0);

			expect(socket.on).toHaveBeenCalledTimes(2);
			expect(socket.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(socket.on).toHaveBeenCalledWith("end", jasmine.any(Function));

			expect(socket.unref).toHaveBeenCalledTimes(1);

			// Fire socket error
			writer.emit = jest.fn();

			socketCallbacks.error(new Error());

			expect(writer.removeSocket).toHaveBeenCalledTimes(1);
			expect(writer.removeSocket).toHaveBeenCalledWith("node-2");

			expect(writer.emit).toHaveBeenCalledTimes(1);
			expect(writer.emit).toHaveBeenCalledWith("error", jasmine.any(Error), "node-2");

			// Socket end
			writer.emit.mockClear();
			writer.removeSocket.mockClear();
			socketCallbacks.end();

			expect(writer.removeSocket).toHaveBeenCalledTimes(1);
			expect(writer.removeSocket).toHaveBeenCalledWith("node-2");

			expect(writer.emit).toHaveBeenCalledTimes(1);
			expect(writer.emit).toHaveBeenCalledWith("end", "node-2");
		});

		netConnectCB();

		return p;
	});

	it("should call manageConnections", () => {
		writer.addSocket = jest.fn();
		transporter.getNode = jest.fn(() => node);
		transporter.sendHello = jest.fn(() => Promise.resolve());
		writer.manageConnections = jest.fn();

		writer.opts.maxConnections = 3;
		writer.sockets.set(1, null);
		writer.sockets.set(2, null);
		writer.sockets.set(3, null);
		writer.sockets.set(4, null);
		writer.sockets.set(5, null);

		let p = writer.connect("node-2").catch(protectReject).then(s => {
			expect(writer.manageConnections).toHaveBeenCalledTimes(1);
		});

		netConnectCB();

		return p;
	});

	it("should reject if sendHello rejected", () => {
		transporter.getNode = jest.fn(() => node);
		transporter.sendHello = jest.fn(() => Promise.reject(new Error("Hello error")));

		let p = writer.connect("node-2").then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toBe("Hello error");
		});

		netConnectCB();

		return p;
	});

	it("should reject if connect throw exception", () => {
		transporter.getNode = jest.fn(() => node);
		net.connect = jest.fn(() => { throw new Error("Connection error"); });

		return writer.connect("node-2").then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toBe("Connection error");
		});

	});

});

describe("Test TcpWriter.manageConnections", () => {
	const broker = new ServiceBroker({ logger: false });
	let transporter, writer;

	beforeEach(() => {
		transporter = {
			logger: broker.logger
		};

	});

	it("should not call removeSocket", () => {
		writer = new TcpWriter(transporter, { maxConnections: 5 });
		writer.sockets.set("node-2", { lastUsed: 4});
		writer.sockets.set("node-3", { lastUsed: 1});
		writer.sockets.set("node-4", { lastUsed: 6});

		writer.removeSocket = jest.fn();

		writer.manageConnections();

		expect(writer.sockets.size).toBe(3);
		expect(writer.removeSocket).toHaveBeenCalledTimes(0);
	});

	it("should call removeSocket", () => {
		writer = new TcpWriter(transporter, { maxConnections: 3 });
		writer.sockets.set("node-2", { lastUsed: 4});
		writer.sockets.set("node-3", { lastUsed: 1});
		writer.sockets.set("node-4", { lastUsed: 6});
		writer.sockets.set("node-5", { lastUsed: 2});
		writer.sockets.set("node-6", { lastUsed: 5});

		writer.removeSocket = jest.fn();

		writer.manageConnections();

		expect(writer.sockets.size).toBe(5);
		expect(writer.removeSocket).toHaveBeenCalledTimes(2);
		expect(writer.removeSocket).toHaveBeenCalledWith("node-5");
		expect(writer.removeSocket).toHaveBeenCalledWith("node-3");
	});

});

describe("Test TcpWriter.addSocket & removeSocket", () => {
	const broker = new ServiceBroker({ logger: false });
	let transporter = {
		logger: broker.logger
	};
	const writer = new TcpWriter(transporter);

	it("should add socket", () => {
		expect(writer.sockets.size).toBe(0);

		writer.addSocket("node-2", { id: 1 });
		expect(writer.sockets.size).toBe(1);
	});

	it("should not add socket", () => {
		expect(writer.sockets.size).toBe(1);

		writer.addSocket("node-2", { id: 2 });
		expect(writer.sockets.size).toBe(1);
		expect(writer.sockets.get("node-2")).toEqual({ id: 1 });
	});

	it("should overwrite socket", () => {
		writer.sockets.get("node-2").destroyed = true;
		expect(writer.sockets.size).toBe(1);

		let s = { id: 3 };
		writer.addSocket("node-2", s);
		expect(writer.sockets.size).toBe(1);
		expect(writer.sockets.get("node-2")).toEqual({ id: 3 });
	});

	it("should overwrite socket with force", () => {
		writer.sockets.get("node-2").destroyed = false;
		expect(writer.sockets.size).toBe(1);

		let s = { id: 4 };
		writer.addSocket("node-2", s, true);
		expect(writer.sockets.size).toBe(1);
		expect(writer.sockets.get("node-2")).toEqual({ id: 4 });
	});


	it("should remove socket", () => {
		let s = {
			destroyed: true,
			destroy: jest.fn()
		};

		writer.addSocket("node-3", s);
		expect(writer.sockets.size).toBe(2);

		writer.removeSocket("node-3");
		expect(writer.sockets.size).toBe(1);
		expect(writer.sockets.get("node-3")).toBeUndefined();

		expect(s.destroy).toHaveBeenCalledTimes(0);
	});

	it("should destroy & remove socket", () => {
		let s = {
			destroyed: false,
			destroy: jest.fn()
		};

		writer.addSocket("node-3", s);
		expect(writer.sockets.size).toBe(2);

		writer.removeSocket("node-3");
		expect(writer.sockets.size).toBe(1);
		expect(writer.sockets.get("node-3")).toBeUndefined();

		expect(s.destroy).toHaveBeenCalledTimes(1);
	});

});


describe("Test TcpWriter.close", () => {
	const broker = new ServiceBroker({ logger: false });
	let transporter = {
		logger: broker.logger
	};
	const writer = new TcpWriter(transporter);

	let end = jest.fn();
	writer.addSocket("node-2", { destroyed: false, end });
	writer.addSocket("node-3", { destroyed: true, end });
	writer.addSocket("node-4", { destroyed: false, end });

	it("should remove all socket", () => {
		expect(writer.sockets.size).toBe(3);
		writer.close();
		expect(writer.sockets.size).toBe(0);

		expect(end).toHaveBeenCalledTimes(2);
	});

});
