const utils						= require("../../../../src/utils");
utils.makeDirs = jest.fn();

const fs						= require("fs");
fs.writeFile = jest.fn();

const ServiceBroker 			= require("../../../../src/service-broker");
const { MoleculerError }		= require("../../../../src/errors");
const Middleware 				= require("../../../../src/middlewares").Debugging.ActionLogger;
const path						= require("path");


describe("Test ActionLogger", () => {
	async function createMW(opts) {
		const broker = new ServiceBroker({
			nodeID: "server-1",
			logger: false,
			middlewares: [
				Middleware(opts)
			]
		});

		broker.createService({
			name: "test",
			actions: {
				ok() {
					return this.Promise.resolve({ result: "ok" });
				},
				fail() {
					return this.Promise.reject(new MoleculerError("Action calling failed."));
				}
			}
		});

		await broker.start();

		return broker;
	}

	function stringify(payload) {
		return JSON.stringify(payload, payload instanceof Error ? Object.getOwnPropertyNames(payload) : null, 4);
	}

	it("should register hooks", () => {
		const mw = Middleware();
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.call).toBeInstanceOf(Function);
	});

	const logger = {
		info: jest.fn()
	};

	describe("Test logging to logger", () => {

		it("should log action call only", async () => {
			logger.info.mockClear();
			const broker = await createMW({ logger, colors: false });

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(logger.info).toBeCalledTimes(2);
			expect(logger.info).toHaveBeenNthCalledWith(1, "Calling 'test.ok'.");
			expect(logger.info).toHaveBeenNthCalledWith(2, "Response for 'test.ok' is received.");

			await broker.stop();
		});

		it("should log action call with params", async () => {
			logger.info.mockClear();
			const broker = await createMW({ logger, colors: false, logParams: true });

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(logger.info).toBeCalledTimes(2);
			expect(logger.info).toHaveBeenNthCalledWith(1, "Calling 'test.ok' with params:", { a: 5 });
			expect(logger.info).toHaveBeenNthCalledWith(2, "Response for 'test.ok' is received.");

			await broker.stop();
		});

		it("should log action call with params & meta", async () => {
			logger.info.mockClear();
			const broker = await createMW({ logger, colors: false, logParams: true, logMeta: true });

			const res = await broker.call("test.ok", { a: 5 }, { meta: { user: "John" } });
			expect(res).toStrictEqual({ result: "ok" });

			expect(logger.info).toBeCalledTimes(3);
			expect(logger.info).toHaveBeenNthCalledWith(1, "Calling 'test.ok' with params:", { a: 5 });
			expect(logger.info).toHaveBeenNthCalledWith(2, "Meta:", { user: "John" });
			expect(logger.info).toHaveBeenNthCalledWith(3, "Response for 'test.ok' is received.");

			await broker.stop();
		});

		it("should log action call with response", async () => {
			logger.info.mockClear();
			const broker = await createMW({ logger, colors: false, logResponse: true });

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(logger.info).toBeCalledTimes(2);
			expect(logger.info).toHaveBeenNthCalledWith(1, "Calling 'test.ok'.");
			expect(logger.info).toHaveBeenNthCalledWith(2, "Response for 'test.ok' is received:", { result: "ok" });

			await broker.stop();
		});

		it("should log failed action call", async () => {
			logger.info.mockClear();

			const broker = await createMW({ logger, colors: false });

			expect.assertions(4);
			try {
				await broker.call("test.fail", { a: 5 });
			} catch(err) {
				expect(err).toBeInstanceOf(MoleculerError);

				expect(logger.info).toBeCalledTimes(2);
				expect(logger.info).toHaveBeenNthCalledWith(1, "Calling 'test.fail'.");
				expect(logger.info).toHaveBeenNthCalledWith(2, "Error for 'test.fail' is received:", err);
			}

			await broker.stop();
		});

		it("should not log if not match whitelist", async () => {
			logger.info.mockClear();

			const broker = await createMW({ logger, colors: false, whitelist: ["$node.*"] });
			await broker.call("test.ok", { a: 5 });
			expect(logger.info).toBeCalledTimes(0);

			await broker.stop();
		});

	});

	describe("Test logging to files", () => {

		it("should log nothing", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const broker = await createMW({ logger, colors: false, folder: "./logs", extension: ".log" });

			expect(utils.makeDirs).toBeCalledTimes(1);
			expect(utils.makeDirs).toBeCalledWith(path.join("logs", "server-1"));

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(fs.writeFile).toBeCalledTimes(0);

			await broker.stop();
		});


		it("should log request", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const broker = await createMW({ logger, colors: false, folder: "./logs", extension: ".log", logParams: true });

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(fs.writeFile).toBeCalledTimes(1);
			expect(fs.writeFile).toHaveBeenNthCalledWith(1, path.join("logs", "server-1", "123456-call-test.ok-request.log"), stringify({ a: 5 }), expect.any(Function));

			await broker.stop();
		});

		it("should log response", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const broker = await createMW({ logger, colors: false, folder: "./logs", logResponse: true });

			const res = await broker.call("test.ok", { a: 5 });
			expect(res).toStrictEqual({ result: "ok" });

			expect(fs.writeFile).toBeCalledTimes(1);
			expect(fs.writeFile).toHaveBeenNthCalledWith(1, path.join("logs", "server-1", "123456-call-test.ok-response.json"), stringify({ result: "ok" }), expect.any(Function));

			await broker.stop();
		});

		it("should log meta & error", async () => {
			fs.writeFile.mockClear();
			Date.now = jest.fn(() => 123456);
			const broker = await createMW({ logger, colors: false, folder: "./logs", extension: ".log", logMeta: true, logResponse: true });

			expect.assertions(5);
			try {
				await broker.call("test.fail", { a: 5 }, { meta: { user: "John" } });
			} catch(err) {
				expect(err).toBeInstanceOf(MoleculerError);
				expect(err.message).toBe("Action calling failed.");

				expect(fs.writeFile).toBeCalledTimes(2);
				expect(fs.writeFile).toHaveBeenNthCalledWith(1, path.join("logs", "server-1", "123456-call-test.fail-meta.log"), stringify({ user: "John" }), expect.any(Function));
				expect(fs.writeFile).toHaveBeenNthCalledWith(2, path.join("logs", "server-1", "123456-call-test.fail-error.log"), stringify(err), expect.any(Function));

				await broker.stop();
			}
		});

	});

});
