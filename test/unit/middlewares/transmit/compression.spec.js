const ServiceBroker = require("../../../../src/service-broker");
const Middleware = require("../../../../src/middlewares").Transmit.Compression;
const { protectReject } = require("../../utils");
const zlib = require("zlib");
const crypto = require("crypto");

const NOT_COMPRESSED_FLAG = Buffer.from([0x00]);
const COMPRESSED_FLAG = Buffer.from([0x01]);

describe("Test CompressionMiddleware", () => {
	const broker = new ServiceBroker({ logger: false });

	describe("Without threshold", () => {
		it("should register hooks", () => {
			const mw = Middleware();
			mw.created(broker);
			expect(mw.transporterSend).toBeInstanceOf(Function);
			expect(mw.transporterReceive).toBeInstanceOf(Function);
		});

		it("should compress with 'deflate'", () => {
			const mw = Middleware({ threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn(() => Promise.resolve());
			const send = mw.transporterSend.call(broker, next);

			return send("topic", Buffer.from("uncompressed data"), meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
					expect(next.mock.calls[0][1]).toEqual(
						Buffer.concat([
							COMPRESSED_FLAG,
							zlib.deflateSync(Buffer.from("uncompressed data"))
						])
					);
				});
		});

		it("should decompress with 'deflate'", () => {
			const mw = Middleware({ threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn();
			const receive = mw.transporterReceive.call(broker, next);
			const compressedData = Buffer.concat([
				COMPRESSED_FLAG,
				zlib.deflateSync(Buffer.from("compressed data"))
			]);

			return receive("topic", compressedData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith(
						"topic",
						Buffer.from("compressed data"),
						meta
					);
				});
		});

		it("should compress with 'deflateRaw'", () => {
			const mw = Middleware({ method: "deflateRaw", threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn(() => Promise.resolve());
			const send = mw.transporterSend.call(broker, next);

			return send("topic", Buffer.from("uncompressed data"), meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
					expect(next.mock.calls[0][1]).toEqual(
						Buffer.concat([
							COMPRESSED_FLAG,
							zlib.deflateRawSync(Buffer.from("uncompressed data"))
						])
					);
				});
		});

		it("should decompress with 'deflateRaw'", () => {
			const mw = Middleware({ method: "deflateRaw", threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn();
			const receive = mw.transporterReceive.call(broker, next);
			const compressedData = Buffer.concat([
				COMPRESSED_FLAG,
				zlib.deflateRawSync(Buffer.from("compressed data"))
			]);

			return receive("topic", compressedData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith(
						"topic",
						Buffer.from("compressed data"),
						meta
					);
				});
		});

		it("should compress with 'gzip'", () => {
			const mw = Middleware({ method: "gzip", threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn(() => Promise.resolve());
			const send = mw.transporterSend.call(broker, next);

			return send("topic", Buffer.from("uncompressed data"), meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
					expect(next.mock.calls[0][1]).toEqual(
						Buffer.concat([
							COMPRESSED_FLAG,
							zlib.gzipSync(Buffer.from("uncompressed data"))
						])
					);
				});
		});

		it("should decompress with 'gzip'", () => {
			const mw = Middleware({ method: "gzip", threshold: 0 });
			mw.created(broker);

			const meta = {};
			const next = jest.fn();
			const receive = mw.transporterReceive.call(broker, next);
			const compressedData = Buffer.concat([
				COMPRESSED_FLAG,
				zlib.gzipSync(Buffer.from("compressed data"))
			]);

			return receive("topic", compressedData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith(
						"topic",
						Buffer.from("compressed data"),
						meta
					);
				});
		});
	});

	describe("With threshold", () => {
		const broker = new ServiceBroker({ logger: false });

		const shortData = crypto.randomBytes(95);
		const longData = crypto.randomBytes(105);

		const mw = Middleware({ threshold: 100 });
		mw.created(broker);
		const meta = {};
		const next = jest.fn(() => Promise.resolve());

		it("should not compress short packets", () => {
			next.mockClear();
			const send = mw.transporterSend.call(broker, next);

			return send("topic", shortData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
					expect(next.mock.calls[0][1]).toEqual(
						Buffer.concat([NOT_COMPRESSED_FLAG, shortData])
					);
				});
		});

		it("should compress large packets", () => {
			next.mockClear();
			const send = mw.transporterSend.call(broker, next);

			return send("topic", longData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
					expect(next.mock.calls[0][1]).toEqual(
						Buffer.concat([COMPRESSED_FLAG, zlib.deflateSync(longData)])
					);
				});
		});

		it("should decompress if compressed regardless the threshold", () => {
			next.mockClear();
			const receive = mw.transporterReceive.call(broker, next);
			const compressedData = Buffer.concat([COMPRESSED_FLAG, zlib.deflateSync(shortData)]);

			return receive("topic", compressedData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", shortData, meta);
				});
		});

		it("should not decompress if not compressed regardless the threshold", () => {
			next.mockClear();
			const receive = mw.transporterReceive.call(broker, next);
			const compressedData = Buffer.concat([NOT_COMPRESSED_FLAG, shortData]);

			return receive("topic", compressedData, meta)
				.catch(protectReject)
				.then(() => {
					expect(next).toHaveBeenCalledTimes(1);
					expect(next).toHaveBeenCalledWith("topic", shortData, meta);
				});
		});
	});
});
