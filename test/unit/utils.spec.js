const utils = require("../../src/utils");


describe("Test utils.generateToken", () => {

	it("should generate unique token", () => {
		let res1 = utils.generateToken();
		expect(res1).toBeDefined();
		expect(res1.length).toBe(36);

		let res2 = utils.generateToken();
		expect(res2).toBeDefined();
		expect(res1).not.toEqual(res2);
	});

});


describe("Test utils.isPromise", () => {
	
	it("should check the param", () => {
		expect(utils.isPromise()).toBe(false);
		expect(utils.isPromise({})).toBe(false);
		expect(utils.isPromise(new Promise(() => {}))).toBe(true);
		expect(utils.isPromise(Promise.resolve())).toBe(true);
		//expect(utils.isPromise(Promise.reject())).toBe(true); // node gives warning
	});

});

describe("Test utils.getNodeID", () => {
	let os = require("os");
	it("should give the computer hostname", () => {
		expect(utils.getNodeID()).toBe(os.hostname().toLowerCase());
	});
});

describe("Test mergeSchemas", () => {

	it("should merge two schemas", () => {

		let origSchema = {
			name: "posts",
			settings: {
				a: 5,
				b: "10",
				nested: {
					id: 10
				},
				array: [
					"first"
				]
			},

			actions: {
				get() {},
				find() {},
				list: {
					cache: {
						keys: ["id"]
					},
					handler() {}
				}
			},

			events: {
				"created"() {},
				"updated"() {}
			},

			methods: {
				getByID() {},
				notify() {}
			},

			created() {},
			started() {}
		};

		let newSchema = {
			name: "users",
			version: 2,
			settings: {
				b: 100,
				c: true,
				nested: {
					name: "John"
				},
				array: [
					"second",
					"third"
				]
			},

			actions: {
				find: {
					cache: false,
					handler() {}
				},
				list() {},
				remove() {}
			},

			events: {
				"created"() {},
				"removed"() {}
			},

			methods: {
				getByID() {},
				checkPermission() {}
			},

			created() {},
			stopped() {},

			customProp: "test"			
		};

		let res = utils.mergeSchemas(origSchema, newSchema);

		expect(res).toBeDefined();
		expect(res.name).toBe("users");
		expect(res.version).toBe(2);
		expect(res.settings).toEqual({
			a: 5, 
			b: 100, 
			c: true, 
			nested: {
				id: 10, 
				name: "John"
			},
			array: [
				"second",
				"third"
			]
		});

		expect(res.actions.get).toBe(origSchema.actions.get);
		expect(res.actions.find).toBe(newSchema.actions.find);
		expect(res.actions.list).toBe(newSchema.actions.list);
		expect(res.actions.remove).toBe(newSchema.actions.remove);

		expect(res.events.created).toBe(newSchema.events.created);
		expect(res.events.updated).toBe(origSchema.events.updated);
		expect(res.events.removed).toBe(newSchema.events.removed);

		expect(res.methods.getByID).toBe(newSchema.methods.getByID);
		expect(res.methods.notify).toBe(origSchema.methods.notify);
		expect(res.methods.checkPermission).toBe(newSchema.methods.checkPermission);
		
		expect(res.created).toBe(newSchema.created);
		expect(res.started).toBe(origSchema.started);
		expect(res.stopped).toBe(newSchema.stopped);

		expect(res.customProp).toBe("test");

	});

});
