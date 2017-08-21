const ProtoBufSerializer = require("../../../src/serializers/protobuf");

describe("Test ProtoBufSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new ProtoBufSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});
