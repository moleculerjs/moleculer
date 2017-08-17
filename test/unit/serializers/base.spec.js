const ServiceBroker = require("../../../src/service-broker");
const Serializer = require("../../../src/serializers/base");


describe("Test BaseSerializer", () => {

	it("check constructor", () => {
		let cacher = new Serializer();
		expect(cacher).toBeDefined();
		expect(cacher.init).toBeDefined();
		expect(cacher.serialize).toBeDefined();
		expect(cacher.deserialize).toBeDefined();
	});

	it("check init", () => {
		let broker = new ServiceBroker();
		let serializer = new Serializer();

		serializer.init(broker);
		expect(serializer.broker).toBe(broker);
	});

});
