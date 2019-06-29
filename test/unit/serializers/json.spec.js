const { cloneDeep } = require("lodash");
const P = require("../../../src/packets");
const JSONSerializer = require("../../../src/serializers/json");


describe("Test JSONSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new JSONSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test JSONSerializer", () => {

	let serializer = new JSONSerializer();
	serializer.init();

	it("should serialize the event packet", () => {
		const obj = {
			ver:"4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(177);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

});
