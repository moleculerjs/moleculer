const ServiceNode = require("../src/service-node");

describe("Test ServiceNode", () => {

	it("constructor with options", () => {
		let opts = {
			id: 5,
			name: "Test Node"
		};

		let node = new ServiceNode(opts);
		expect(node).toBeDefined();
		expect(node.options).toBe(opts);
		expect(node.id).toBe(opts.id);
		expect(node.name).toBe(opts.name);
	});

	it("constructor without options", () => {
		let node = new ServiceNode();
		expect(node).toBeDefined();
		expect(node.options).toBeDefined;
		expect(node.id).toBeDefined;
		expect(node.name).toBe(node.id);
	});

});
