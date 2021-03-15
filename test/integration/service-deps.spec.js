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
		return broker2.start().delay(1000).then(() => {
			expect(startedMain).toHaveBeenCalledTimes(1);
			expect(startedMath).toHaveBeenCalledTimes(1);
		});
	});

});
