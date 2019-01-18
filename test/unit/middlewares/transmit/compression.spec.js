const _ = require("lodash");
const ServiceBroker = require("../../../../src/service-broker");
const Middleware = require("../../../../src/middlewares").Transmit.Compression;
const { protectReject } = require("../../utils");
const zlib = require("zlib");

describe("Test CompressionMiddleware", () => {
	const broker = new ServiceBroker({ logger: false });

	it("should register hooks", () => {
		const mw = Middleware();
		expect(mw.transporterSend).toBeInstanceOf(Function);
		expect(mw.transporterReceive).toBeInstanceOf(Function);
	});

	it("should compress with 'deflate'", () => {
		const mw = Middleware();

		const meta = {};
		const next = jest.fn();
		const send = mw.transporterSend.call(broker, next);

		return send("topic", Buffer.from("uncompressed data"), meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
			expect(next.mock.calls[0][1]).toEqual(zlib.deflateSync(Buffer.from("uncompressed data")));
		});
	});

	it("should decompress with 'deflate'", () => {
		const mw = Middleware();

		const meta = {};
		const next = jest.fn();
		const receive = mw.transporterReceive.call(broker, next);
		const compressedData = zlib.deflateSync(Buffer.from("compressed data"));

		return receive("topic", compressedData, meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", Buffer.from("compressed data"), meta);
		});
	});

	it("should compress with 'deflateRaw'", () => {
		const mw = Middleware({ method: "deflateRaw" });

		const meta = {};
		const next = jest.fn();
		const send = mw.transporterSend.call(broker, next);

		return send("topic", Buffer.from("uncompressed data"), meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
			expect(next.mock.calls[0][1]).toEqual(zlib.deflateRawSync(Buffer.from("uncompressed data")));
		});
	});

	it("should decompress with 'deflateRaw'", () => {
		const mw = Middleware({ method: "deflateRaw" });

		const meta = {};
		const next = jest.fn();
		const receive = mw.transporterReceive.call(broker, next);
		const compressedData = zlib.deflateRawSync(Buffer.from("compressed data"));

		return receive("topic", compressedData, meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", Buffer.from("compressed data"), meta);
		});
	});

	it("should compress with 'gzip'", () => {
		const mw = Middleware({ method: "gzip" });

		const meta = {};
		const next = jest.fn();
		const send = mw.transporterSend.call(broker, next);

		return send("topic", Buffer.from("uncompressed data"), meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
			expect(next.mock.calls[0][1]).toEqual(zlib.gzipSync(Buffer.from("uncompressed data")));
		});
	});

	it("should decompress with 'gzip'", () => {
		const mw = Middleware({ method: "gzip" });

		const meta = {};
		const next = jest.fn();
		const receive = mw.transporterReceive.call(broker, next);
		const compressedData = zlib.gzipSync(Buffer.from("compressed data"));

		return receive("topic", compressedData, meta).then(() => {
			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith("topic", Buffer.from("compressed data"), meta);
		});
	});

});


