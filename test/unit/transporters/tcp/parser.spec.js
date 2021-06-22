"use strict";

const P = require("../../../../src/packets");
const Parser = require("../../../../src/transporters/tcp/parser");

describe("Test Parser constructor", () => {

	it("check constructor", () => {
		let opts = {};

		let parser = new Parser(opts, 5000);

		expect(parser.maxPacketSize).toBe(5000);
		expect(parser.buf).toBeNull();
	});

});

describe("Test Parser write", () => {
	let parser;
	let onError = jest.fn();
	let onData = jest.fn();

	beforeEach(() => {
		parser = new Parser(null, 512);
		parser.on("error", onError);
		parser.on("data", onData);
	});

	it("should store chunk in buffer if length is smaller than 6 bytes", () => {
		let cb = jest.fn();

		let buf = Buffer.alloc(5, "0");
		parser._write(buf, null, cb);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith();
		expect(parser.buf).toBeInstanceOf(Buffer);
		expect(parser.buf.toString()).toBe("00000");
	});

	it("should concat previous chunk and throw CRC error", () => {
		let cb = jest.fn();

		// Preload buffer
		parser.buf = Buffer.alloc(5, "0");

		let buf = Buffer.alloc(5, "1");
		parser._write(buf, null, cb);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(expect.any(Error));
		let err = cb.mock.calls[0][0];
		expect(err.message).toBe("Invalid packet CRC! 49");
		expect(parser.buf).toBeNull();
	});

	it("should throw error if packet is too large", () => {
		let cb = jest.fn();

		let buf = Buffer.alloc(513, "0");
		parser._write(buf, null, cb);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(expect.any(Error));
		let err = cb.mock.calls[0][0];
		expect(err.message).toBe("Incoming packet is larger than the 'maxPacketSize' limit (513 > 512)!");
		expect(parser.buf).toBeNull();
	});

	it("should emit data with valid chunk", () => {
		let cb = jest.fn();

		let buf = Buffer.from([12, 0, 0, 0, 10, 6, 100, 97, 116, 97]);
		parser._write(buf, null, cb);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith();

		expect(onData).toHaveBeenCalledTimes(1);
		expect(onData).toHaveBeenCalledWith(P.PACKET_GOSSIP_REQ, expect.any(Buffer));
		let data = onData.mock.calls[0][1];
		expect(data.toString()).toBe("data");

		expect(parser.buf).toBeNull();
	});

	it("should multiple emit data with valid chunks & store rest chunk", () => {
		let cb = jest.fn();
		onData.mockClear();

		let buf = Buffer.from([13, 0, 0, 0, 11, 6, 100, 97, 116, 97, 49].concat([12, 0, 0, 0, 11, 7, 100, 97, 116, 97, 50], [13, 0, 0, 0, 11, 6, 100, 97]));
		parser._write(buf, null, cb);

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith();

		expect(onData).toHaveBeenCalledTimes(2);
		expect(onData).toHaveBeenCalledWith(P.PACKET_GOSSIP_REQ, expect.any(Buffer));
		let data = onData.mock.calls[0][1];
		expect(data.toString()).toBe("data1");

		expect(onData).toHaveBeenCalledWith(P.PACKET_GOSSIP_RES, expect.any(Buffer));
		data = onData.mock.calls[1][1];
		expect(data.toString()).toBe("data2");

		expect(parser.buf).toBeInstanceOf(Buffer);
		expect(parser.buf).toEqual(Buffer.from([13, 0, 0, 0, 11, 6, 100, 97]));
	});

});

