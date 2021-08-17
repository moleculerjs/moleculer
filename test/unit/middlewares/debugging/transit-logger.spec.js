const utils = require("../../../../src/utils");
utils.makeDirs = jest.fn();

const fs = require("fs");
fs.writeFile = jest.fn();

const ServiceBroker = require("../../../../src/service-broker");
const Middleware = require("../../../../src/middlewares").Debugging.TransitLogger;
const path = require("path");

describe("Test ActionLogger", () => {
	function createMW(opts) {
		const broker = new ServiceBroker({ logger: false, nodeID: "server-1" });
		const mw = Middleware(opts);
		mw.created(broker);
		return mw;
	}

	function stringify(payload) {
		return JSON.stringify(
			payload,
			payload instanceof Error ? Object.getOwnPropertyNames(payload) : null,
			4
		);
	}

	it("should register hooks", () => {
		const mw = createMW();
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.transitPublish).toBeInstanceOf(Function);
		expect(mw.transitMessageHandler).toBeInstanceOf(Function);
	});

	const logger = {
		info: jest.fn()
	};

	describe("Test logging published packets", () => {
		it("should log published packet", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false });

			const next = jest.fn();
			const packet = { type: "REQUEST", target: "server-2", params: { a: 5 } };
			mw.transitPublish(next)(packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith(packet);

			expect(logger.info).toBeCalledTimes(1);
			expect(logger.info).toHaveBeenNthCalledWith(1, "=> Send REQUEST packet to 'server-2'");
		});

		it("should log published packet with payload", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false, logPacketData: true });

			const next = jest.fn();
			const packet = { type: "REQUEST", target: "server-2", payload: { a: 5 } };
			mw.transitPublish(next)(packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith(packet);

			expect(logger.info).toBeCalledTimes(2);
			expect(logger.info).toHaveBeenNthCalledWith(1, "=> Send REQUEST packet to 'server-2'");
			expect(logger.info).toHaveBeenNthCalledWith(2, "=>", packet.payload);
		});

		it("should not log if not match whitelist", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false, logPacketData: true });

			const next = jest.fn();
			const packet = { type: "HEARTBEAT", target: "server-2", payload: { a: 5 } };
			mw.transitPublish(next)(packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith(packet);

			expect(logger.info).toBeCalledTimes(0);
		});

		it("should log published packet to file", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const mw = createMW({
				logger,
				colors: false,
				folder: "./logs",
				extension: ".log",
				logParams: true
			});

			expect(utils.makeDirs).toBeCalledTimes(1);
			expect(utils.makeDirs).toBeCalledWith(path.join("logs", "server-1"));

			const next = jest.fn();
			const packet = { type: "REQUEST", target: "server-2", payload: { a: 5 } };
			mw.transitPublish(next)(packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith(packet);

			expect(fs.writeFile).toBeCalledTimes(1);
			expect(fs.writeFile).toHaveBeenNthCalledWith(
				1,
				path.join("logs", "server-1", "123456-send-REQUEST-to-server-2.log"),
				stringify({ a: 5 }),
				expect.any(Function)
			);
		});
	});

	describe("Test logging received packets", () => {
		const packet = { payload: { sender: "server-2", params: { a: 5 } } };

		it("should log received packet", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false });

			const next = jest.fn();
			mw.transitMessageHandler(next)("RESPONSE", packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith("RESPONSE", packet);

			expect(logger.info).toBeCalledTimes(1);
			expect(logger.info).toHaveBeenNthCalledWith(
				1,
				"<= Receive RESPONSE packet from 'server-2'"
			);
		});

		it("should log received packet with payload", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false, logPacketData: true });

			const next = jest.fn();
			mw.transitMessageHandler(next)("RESPONSE", packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith("RESPONSE", packet);

			expect(logger.info).toBeCalledTimes(2);
			expect(logger.info).toHaveBeenNthCalledWith(
				1,
				"<= Receive RESPONSE packet from 'server-2'"
			);
			expect(logger.info).toHaveBeenNthCalledWith(2, "<=", packet.payload);
		});

		it("should not log if not match whitelist", async () => {
			logger.info.mockClear();
			const mw = createMW({ logger, colors: false, logPacketData: true });

			const next = jest.fn();
			mw.transitMessageHandler(next)("HEARTBEAT", packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith("HEARTBEAT", packet);

			expect(logger.info).toBeCalledTimes(0);
		});

		it("should log received packet to file", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const mw = createMW({
				logger,
				colors: false,
				folder: "./logs",
				extension: ".log",
				logParams: true
			});

			const next = jest.fn();
			mw.transitMessageHandler(next)("RESPONSE", packet);

			expect(next).toBeCalledTimes(1);
			expect(next).toBeCalledWith("RESPONSE", packet);

			expect(fs.writeFile).toBeCalledTimes(1);
			expect(fs.writeFile).toHaveBeenNthCalledWith(
				1,
				path.join("logs", "server-1", "123456-receive-RESPONSE-from-server-2.log"),
				stringify(packet.payload),
				expect.any(Function)
			);
		});
	});
});
