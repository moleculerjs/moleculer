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

			dependencies: [
				"posts",
				"users"
			],

			metadata: {
				a: "a",
				b: 33,
				d: true,
				nested: {
					old: 1,
					tag: "old"
				}
			},

			actions: {
				get() {},
				find() {},
				list: {
					cache: {
						keys: ["id"]
					},
					handler() {}
				},
				create() {},
				update: {
					use: [],
					handler() {

					}
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

			created: jest.fn(),
			started: jest.fn(),
			stopped: jest.fn()
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

			dependencies: "math",

			metadata: {
				a: "aaa",
				b: 25,
				c: "metadata",
				nested: {
					tag: "new",
					res: "test"
				}
			},

			actions: {
				find: {
					cache: false,
					handler() {}
				},
				list() {},
				create: {
					cache: {
						keys: ["id"]
					}
				},
				update() {
				},
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

			created: jest.fn(),
			started: jest.fn(),
			stopped: jest.fn(),

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
		expect(res.metadata).toEqual({
			a: "aaa",
			b: 25,
			c: "metadata",
			d: true,
			nested: {
				old: 1,
				tag: "new",
				res: "test"
			}
		});
		expect(res.dependencies).toEqual(["math", "posts", "users"]);

		expect(res.actions.get).toBe(origSchema.actions.get);
		expect(res.actions.find.handler).toBe(newSchema.actions.find.handler);
		expect(res.actions.find.cache).toBe(false);
		expect(res.actions.list.handler).toBe(newSchema.actions.list);
		expect(res.actions.remove.handler).toBe(newSchema.actions.remove);

		// Merge action definition
		expect(res.actions.create).toEqual({
			cache: {
				keys: ["id"]
			},
			handler: origSchema.actions.create
		});
		expect(res.actions.create.handler).toBe(origSchema.actions.create);

		expect(res.actions.update).toEqual({
			use: [],
			handler: newSchema.actions.update
		});
		expect(res.actions.update.handler).toBe(newSchema.actions.update);

		expect(res.events.created).toBeInstanceOf(Array);
		expect(res.events.created[0]).toBe(origSchema.events.created);
		expect(res.events.created[1]).toBe(newSchema.events.created);

		expect(res.events.updated).toBe(origSchema.events.updated);
		expect(res.events.removed).toBeInstanceOf(Array);
		expect(res.events.removed[0]).toBe(newSchema.events.removed);

		expect(res.methods.getByID).toBe(newSchema.methods.getByID);
		expect(res.methods.notify).toBe(origSchema.methods.notify);
		expect(res.methods.checkPermission).toBe(newSchema.methods.checkPermission);

		expect(res.created).toBeInstanceOf(Array);
		expect(res.started).toBeInstanceOf(Array);
		expect(res.stopped).toBeInstanceOf(Array);

		expect(res.created[0]).toBe(origSchema.created);
		expect(res.created[1]).toBe(newSchema.created);

		expect(res.started[0]).toBe(origSchema.started);
		expect(res.started[1]).toBe(newSchema.started);

		expect(res.stopped[0]).toBe(origSchema.stopped);
		expect(res.stopped[1]).toBe(newSchema.stopped);

		expect(res.customProp).toBe("test");

	});

	it("should concat tlifecycle events", () => {

		let origSchema = {
			created: jest.fn(),
			started: jest.fn()
		};

		let newSchema = {
			created: jest.fn(),
			stopped: jest.fn()
		};

		let res = utils.mergeSchemas(origSchema, newSchema);

		expect(res).toBeDefined();

		expect(res.created).toBeInstanceOf(Array);
		expect(res.created.length).toBe(2);
		expect(res.created[0]).toBe(origSchema.created);
		expect(res.created[1]).toBe(newSchema.created);

		expect(res.started).toBe(origSchema.started);

		expect(res.stopped).toBeInstanceOf(Array);
		expect(res.stopped.length).toBe(1);
		expect(res.stopped[0]).toBe(newSchema.stopped);

	});

});
