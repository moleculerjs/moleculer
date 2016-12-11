const bus = require("../src/service-bus");

describe("Test ServiceBus", () => {

	it("some", () => {
		expect(bus).toBeDefined();
		expect(bus.emit).toBeDefined();
		expect(bus.on).toBeDefined();
	});

});
