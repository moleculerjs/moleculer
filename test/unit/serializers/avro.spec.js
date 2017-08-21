const AvroSerializer = require("../../../src/serializers/avro");


describe("Test AvroSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new AvroSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});
