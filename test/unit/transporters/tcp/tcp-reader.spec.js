"use strict";

const ServiceBroker = require("../../../../src/service-broker");
const { protectReject } = require("../../utils");

// const lolex = require("lolex");
jest.mock("net");
const net = require("net");

jest.mock("../../../../src/transporters/tcp/parser");

let Parser = require("../../../../src/transporters/tcp/parser");
Parser.mockImplementation(() => {
	let callbacks = {};
	let parser = {
		on: jest.fn((type, cb) => callbacks[type] = cb),
		__callbacks: callbacks
	};

	return parser;
});

const TcpReader = require("../../../../src/transporters/tcp/tcp-reader");

describe("Test TcpReader constructor", () => {

	it("check constructor", () => {
		let transporter = {
			logger: jest.fn()
		};
		let opts = { port: 1234 };
		let reader = new TcpReader(transporter, opts);
		expect(reader).toBeDefined();
		expect(reader.transporter).toBe(transporter);
		expect(reader.opts).toBe(opts);

		expect(reader.sockets).toBeInstanceOf(Array);
		expect(reader.logger).toBe(transporter.logger);
	});

});

describe("Test TcpReader.listen", () => {
	const broker = new ServiceBroker();
	let transporter, reader;

	let listenCb, serverErrorCb;
	let server = {
		on: jest.fn((type, cb) => serverErrorCb = cb),
		listen: jest.fn((type, cb) => listenCb = cb),
		address: jest.fn(() => ({ port: 5000 }))
	};

	let netCreateCB;
	net.createServer = jest.fn(cb => {
		netCreateCB = cb;
		return server;
	});

	beforeEach(() => {
		transporter = {
			getNode: jest.fn(() => null),
			getNodeAddress: jest.fn(() => "node-2-host"),
			sendHello: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		reader = new TcpReader(transporter, { port: 1234 });
	});

	it("should create server & listen", () => {
		reader.onTcpClientConnected = jest.fn();

		let p = reader.listen().catch(protectReject).then(() => {
			expect(reader.server).toBe(server);

			expect(server.on).toHaveBeenCalledTimes(1);
			expect(server.on).toHaveBeenCalledWith("error", jasmine.any(Function));

			expect(server.listen).toHaveBeenCalledTimes(1);
			expect(server.listen).toHaveBeenCalledWith({port: 1234, exclusive: true }, jasmine.any(Function));

			expect(reader.opts.port).toBe(5000);
			expect(reader.connected).toBe(true);

			// Fire new connection event handler
			expect(reader.onTcpClientConnected).toHaveBeenCalledTimes(0);

			let socket = {};
			netCreateCB(socket);

			expect(reader.onTcpClientConnected).toHaveBeenCalledTimes(1);
			expect(reader.onTcpClientConnected).toHaveBeenCalledWith(socket);
		});

		listenCb();

		return p;
	});

	it("should reject on server error", () => {
		let p = reader.listen().then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toBe("Server error");
		});

		serverErrorCb(new Error("Server error"));

		return p;
	});

});

describe("Test TcpReader.onTcpClientConnected", () => {
	const broker = new ServiceBroker();
	let transporter, socket, reader;

	beforeEach(() => {
		transporter = {
			getNode: jest.fn(() => null),
			getNodeAddress: jest.fn(() => "node-2-host"),
			sendHello: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		let socketCallbacks = {};
		socket = {
			on: jest.fn((type, cb) => socketCallbacks[type] = cb),
			pipe: jest.fn(parser => socket.parser = parser),
			address: jest.fn(() => ({ address: "192.168.1.2" })),
			setNoDelay: jest.fn(),
			__callbacks: socketCallbacks
		};
		reader = new TcpReader(transporter, { maxPacketSize : 5000 });
	});

	it("should create parser and set event handlers", () => {

		reader.onTcpClientConnected(socket);

		expect(socket.on).toHaveBeenCalledTimes(2);
		expect(socket.on).toHaveBeenCalledWith("error", jasmine.any(Function));
		expect(socket.on).toHaveBeenCalledWith("close", jasmine.any(Function));

		expect(socket.setNoDelay).toHaveBeenCalledTimes(1);
		expect(socket.address).toHaveBeenCalledTimes(1);

		expect(socket.pipe).toHaveBeenCalledTimes(1);
		expect(socket.pipe).toHaveBeenCalledWith(socket.parser);
	});

	it("should call onIncomingMessage when parser has data", () => {
		transporter.onIncomingMessage = jest.fn();

		reader.onTcpClientConnected(socket);

		socket.parser.__callbacks.data("REQ", "message");

		expect(transporter.onIncomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.onIncomingMessage).toHaveBeenCalledWith("REQ", "message");
	});

	it("should call closeSocket on parser error", () => {
		reader.closeSocket = jest.fn();

		reader.onTcpClientConnected(socket);

		const parserErr = new Error("Parser error");
		socket.parser.__callbacks.error(parserErr);

		expect(reader.closeSocket).toHaveBeenCalledTimes(1);
		expect(reader.closeSocket).toHaveBeenCalledWith(socket, parserErr);
	});

	it("should call closeSocket on socket error", () => {
		reader.closeSocket = jest.fn();

		reader.onTcpClientConnected(socket);

		const socketErr = new Error("Socket error");
		socket.__callbacks.error(socketErr);

		expect(reader.closeSocket).toHaveBeenCalledTimes(1);
		expect(reader.closeSocket).toHaveBeenCalledWith(socket, socketErr);
	});

	it("should call closeSocket on socket close", () => {
		reader.closeSocket = jest.fn();

		reader.onTcpClientConnected(socket);

		reader.closeSocket.mockClear();
		socket.__callbacks.close(true);

		expect(reader.closeSocket).toHaveBeenCalledTimes(1);
		expect(reader.closeSocket).toHaveBeenCalledWith(socket);
	});
});


describe("Test TcpReader.close", () => {
	const broker = new ServiceBroker();
	let transporter, reader;

	beforeEach(() => {
		transporter = {
			getNode: jest.fn(() => null),
			getNodeAddress: jest.fn(() => "node-2-host"),
			sendHello: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		reader = new TcpReader(transporter, {});
	});

	beforeEach(() => {
		transporter = {
			getNode: jest.fn(() => null),
			getNodeAddress: jest.fn(() => "node-2-host"),
			sendHello: jest.fn(() => Promise.resolve()),
			logger: broker.logger
		};

		reader = new TcpReader(transporter, { port: 1234 });
	});

	it("should close socket & remove from sockets list", () => {

		let destroy = jest.fn();
		reader.sockets.push({ id: 1, destroy });
		reader.sockets.push({ id: 2, destroy });
		reader.sockets.push({ id: 3, destroy });

		reader.closeSocket(reader.sockets[1]);

		expect(reader.sockets.length).toBe(2);
		expect(destroy).toHaveBeenCalledTimes(1);
		expect(reader.sockets.find(s => s.id == 2)).toBeUndefined();
	});

	it("should close server & all sockets", () => {

		let server = {
			listening: true,
			close: jest.fn()
		};
		reader.server = server;

		let destroy = jest.fn();
		reader.sockets.length = 0;
		reader.sockets.push({ destroy });
		reader.sockets.push({ destroy });
		reader.sockets.push({ destroy });

		reader.close();

		expect(server.close).toHaveBeenCalledTimes(1);
		expect(reader.sockets.length).toBe(0);
		expect(destroy).toHaveBeenCalledTimes(3);
	});

});
