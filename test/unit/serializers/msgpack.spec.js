const MsgPackSerializer = require("../../../src/serializers/msgpack");

describe("Test MsgPackSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new MsgPackSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});
