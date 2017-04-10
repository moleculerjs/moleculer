const ServiceBroker = require("../../../src/service-broker");
const JSONSerializer = require("../../../src/serializers/json");


describe("Test JSONSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new JSONSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test JSONSerializer serialize", () => {

	let broker = new ServiceBroker();
	let serializer = new JSONSerializer();
	serializer.init(broker);

	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};

	it("should convert data to JSON string", () => {
		const res = serializer.serialize(data1);
		expect(res).toBe("{\"a\":1,\"b\":false,\"c\":\"Test\",\"d\":{\"e\":55}}");
	});

	it("should give undefined if data is not defined", () => {
		const res = serializer.serialize();
		expect(res).toBe(undefined);
	});

	it("should give null if data is null", () => {
		const res = serializer.serialize(null);
		expect(res).toBe("null");
	});

});
