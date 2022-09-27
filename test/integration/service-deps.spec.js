const ServiceBroker = require("../../src/service-broker");

describe("Test Service dependencies", () => {
	const broker1 = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "fake" });
	const broker2 = new ServiceBroker({ logger: false, nodeID: "node-2", transporter: "fake" });

	const startedMain = jest.fn();
	broker1.createService({
		name: "main",
		dependencies: ["test", "math"],
		started: startedMain
	});

	const startedMath = jest.fn();
	broker2.createService({
		name: "math",
		dependencies: { name: "test" },
		started: startedMath
	});

	broker2.createService({
		name: "test"
	});

	broker1.start();

	it("should not call main started", () => {
		return broker1.Promise.delay(500).then(() => {
			expect(startedMain).toHaveBeenCalledTimes(0);
		});
	});

	it("should call main started if broker2.starts", () => {
		return broker2
			.start()
			.delay(2000)
			.then(() => {
				expect(startedMain).toHaveBeenCalledTimes(1);
				expect(startedMath).toHaveBeenCalledTimes(1);
			});
	});

	describe("mutually exclusive dependencies", () => {
		let broker;
		let startedFn;

		beforeEach(() => {
			jest.resetAllMocks();

			broker = new ServiceBroker({
				logger: false,
				nodeID: "node-3",
				transporter: "fake"
			});
			startedFn = jest.fn();

			broker.createService({
				name: "other",
				dependencies: [{ name: "thing", version: [1, 2] }],
				started: startedFn
			});
		});

		afterEach(async () => {
			await broker.stop();
		});

		it.each([1, 2])("fulfils dependency with v%d", async version => {
			await broker.Promise.delay(500);
			expect(startedFn).not.toBeCalled();

			broker.createService({
				name: "thing",
				version
			});
			await broker.start();

			expect(startedFn).toBeCalled();
		});

		it("does not fulfil dependency with other version", async () => {
			await broker.Promise.delay(500);
			expect(startedFn).not.toBeCalled();

			broker.createService({
				name: "thing",
				version: 10
			});

			await broker.Promise.delay(500);
			expect(startedFn).not.toBeCalled();
		});
	});
});
