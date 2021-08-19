const ServiceBroker = require("../../../src/service-broker");
const Serializer = require("../../../src/serializers/base");
const P = require("../../../src/packets");

describe("Test BaseSerializer", () => {
	it("check constructor", () => {
		let cacher = new Serializer();
		expect(cacher).toBeDefined();
		expect(cacher.init).toBeDefined();
		expect(cacher.serialize).toBeDefined();
		expect(cacher.deserialize).toBeDefined();
	});

	it("check init", () => {
		let broker = new ServiceBroker({ logger: false });
		let serializer = new Serializer();

		serializer.init(broker);
		expect(serializer.broker).toBe(broker);
	});
});

describe("Test serializer.serializeCustomFields", () => {
	let serializer;

	beforeEach(() => {
		let broker = new ServiceBroker({ logger: false });
		serializer = new Serializer();

		serializer.init(broker);
	});

	it("check with PACKET_INFO", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_INFO, {
				sender: "node-1",
				services: [{ name: "users", settings: {} }],
				config: {
					a: 5
				},
				instanceID: "123456",
				client: {
					version: 5
				},
				metadata: {
					region: "eu-west1"
				}
			})
		).toEqual({
			client: {
				version: 5
			},
			config: '{"a":5}',
			instanceID: "123456",
			sender: "node-1",
			services: '[{"name":"users","settings":{}}]',
			metadata: '{"region":"eu-west1"}'
		});
	});

	it("check with PACKET_EVENT", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_EVENT, {
				sender: "node-1",
				event: "user.created",
				data: {
					id: 5
				},
				groups: ["mail"]
			})
		).toEqual({
			data: Buffer.from('{"id":5}'),
			dataType: 2,
			event: "user.created",
			groups: ["mail"],
			sender: "node-1"
		});
	});

	it("check with PACKET_EVENT with null", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_EVENT, {
				sender: "node-1",
				event: "user.created",
				data: null,
				groups: ["mail"]
			})
		).toEqual({
			data: null,
			dataType: 1,
			event: "user.created",
			groups: ["mail"],
			sender: "node-1"
		});
	});

	it("check with PACKET_EVENT with Buffer", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_EVENT, {
				sender: "node-1",
				event: "user.created",
				data: Buffer.from("moleculer"),
				groups: ["mail"]
			})
		).toEqual({
			data: Buffer.from("moleculer"),
			dataType: 3,
			event: "user.created",
			groups: ["mail"],
			sender: "node-1"
		});
	});

	it("check with PACKET_REQUEST with null", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_REQUEST, {
				sender: "node-1",
				action: "users.create",
				params: null,
				meta: {
					token: "12345"
				},
				requestID: "1111",
				stream: false
			})
		).toEqual({
			action: "users.create",
			meta: '{"token":"12345"}',
			params: null,
			paramsType: 1,
			requestID: "1111",
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_REQUEST with params", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_REQUEST, {
				sender: "node-1",
				action: "users.create",
				params: {
					name: "John"
				},
				meta: {
					token: "12345"
				},
				requestID: "1111",
				stream: false
			})
		).toEqual({
			action: "users.create",
			meta: '{"token":"12345"}',
			params: Buffer.from('{"name":"John"}'),
			paramsType: 2,
			requestID: "1111",
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_REQUEST with Buffer", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_REQUEST, {
				sender: "node-1",
				action: "users.create",
				params: Buffer.from("binary data"),
				meta: {
					token: "12345"
				},
				requestID: "1111",
				stream: false
			})
		).toEqual({
			action: "users.create",
			meta: '{"token":"12345"}',
			params: Buffer.from("binary data"),
			paramsType: 3,
			requestID: "1111",
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_REQUEST with stream", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_REQUEST, {
				sender: "node-1",
				action: "users.create",
				params: Buffer.from("binary data"),
				meta: {
					token: "12345"
				},
				requestID: "1111",
				stream: true
			})
		).toEqual({
			action: "users.create",
			meta: '{"token":"12345"}',
			params: Buffer.from("binary data"),
			paramsType: 3,
			requestID: "1111",
			sender: "node-1",
			stream: true
		});
	});

	it("check with PACKET_RESPONSE with null", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_RESPONSE, {
				sender: "node-1",
				id: "12345",
				data: null,
				error: {
					name: "SomeError"
				},
				meta: {
					token: "12345"
				},
				stream: false
			})
		).toEqual({
			data: null,
			dataType: 1,
			error: '{"name":"SomeError"}',
			id: "12345",
			meta: '{"token":"12345"}',
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_RESPONSE", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_RESPONSE, {
				sender: "node-1",
				id: "12345",
				data: {
					id: 5
				},
				error: {
					name: "SomeError"
				},
				meta: {
					token: "12345"
				},
				stream: false
			})
		).toEqual({
			data: Buffer.from('{"id":5}'),
			dataType: 2,
			error: '{"name":"SomeError"}',
			id: "12345",
			meta: '{"token":"12345"}',
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_RESPONSE with Buffer", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_RESPONSE, {
				sender: "node-1",
				id: "12345",
				data: Buffer.from("binary data"),
				error: {
					name: "SomeError"
				},
				meta: {
					token: "12345"
				},
				stream: false
			})
		).toEqual({
			data: Buffer.from("binary data"),
			dataType: 3,
			error: '{"name":"SomeError"}',
			id: "12345",
			meta: '{"token":"12345"}',
			sender: "node-1",
			stream: false
		});
	});

	it("check with PACKET_RESPONSE with stream", () => {
		expect(
			serializer.serializeCustomFields(P.PACKET_RESPONSE, {
				sender: "node-1",
				id: "12345",
				data: Buffer.from("binary data"),
				error: {
					name: "SomeError"
				},
				meta: {
					token: "12345"
				},
				stream: true
			})
		).toEqual({
			data: Buffer.from("binary data"),
			dataType: 3,
			error: '{"name":"SomeError"}',
			id: "12345",
			meta: '{"token":"12345"}',
			sender: "node-1",
			stream: true
		});
	});
});

describe("Test serializer.deserializeCustomFields", () => {
	let serializer;

	beforeEach(() => {
		let broker = new ServiceBroker({ logger: false });
		serializer = new Serializer();

		serializer.init(broker);
	});

	it("check with PACKET_INFO", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_INFO, {
				client: {
					version: 5
				},
				config: '{"a":5}',
				instanceID: "123456",
				sender: "node-1",
				services: '[{"name":"users","settings":{}}]',
				metadata: '{"region":"eu-west1"}'
			})
		).toEqual({
			sender: "node-1",
			services: [{ name: "users", settings: {} }],
			instanceID: "123456",
			config: {
				a: 5
			},
			client: {
				version: 5
			},
			metadata: {
				region: "eu-west1"
			}
		});
	});

	it("check with PACKET_EVENT with null", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_EVENT, {
				data: null,
				dataType: 1,
				meta: '{"name":"John"}',
				event: "user.created",
				groups: ["mail"],
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			event: "user.created",
			data: null,
			meta: { name: "John" },
			groups: ["mail"]
		});
	});

	it("check with PACKET_EVENT with data", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_EVENT, {
				data: Buffer.from('{"id":5}'),
				dataType: 2,
				meta: '{"name":"John"}',
				event: "user.created",
				groups: ["mail"],
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			event: "user.created",
			data: {
				id: 5
			},
			meta: { name: "John" },
			groups: ["mail"]
		});
	});

	it("check with PACKET_EVENT with Buffer", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_EVENT, {
				data: Buffer.from("binary data"),
				dataType: 3,
				meta: '{"name":"John"}',
				event: "user.created",
				groups: ["mail"],
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			event: "user.created",
			data: Buffer.from("binary data"),
			meta: { name: "John" },
			groups: ["mail"]
		});
	});

	it("check with PACKET_REQUEST with null", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_REQUEST, {
				action: "users.create",
				meta: '{"token":"12345"}',
				params: null,
				paramsType: 1,
				requestID: "1111",
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			action: "users.create",
			params: null,
			meta: {
				token: "12345"
			},
			requestID: "1111"
		});
	});

	it("check with PACKET_REQUEST with JSON", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_REQUEST, {
				action: "users.create",
				meta: '{"token":"12345"}',
				params: '{"name":"John"}',
				paramsType: 2,
				requestID: "1111",
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			action: "users.create",
			params: {
				name: "John"
			},
			meta: {
				token: "12345"
			},
			requestID: "1111"
		});
	});

	it("check with PACKET_REQUEST with Buffer", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_REQUEST, {
				action: "users.create",
				meta: '{"token":"12345"}',
				params: Buffer.from("binary data"),
				paramsType: 3,
				requestID: "1111",
				stream: true,
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			action: "users.create",
			params: Buffer.from("binary data"),
			meta: {
				token: "12345"
			},
			stream: true,
			requestID: "1111"
		});
	});

	it("check with PACKET_REQUEST with stream", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_REQUEST, {
				action: "users.create",
				meta: '{"token":"12345"}',
				params: Buffer.from("binary data"),
				paramsType: 3,
				requestID: "1111",
				stream: true,
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			action: "users.create",
			params: Buffer.from("binary data"),
			meta: {
				token: "12345"
			},
			stream: true,
			requestID: "1111"
		});
	});

	it("check with PACKET_RESPONSE with null", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_RESPONSE, {
				data: null,
				dataType: 1,
				error: '{"name":"SomeError"}',
				id: "12345",
				meta: '{"token":"12345"}',
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			id: "12345",
			data: null,
			error: {
				name: "SomeError"
			},
			meta: {
				token: "12345"
			}
		});
	});

	it("check with PACKET_RESPONSE with JSON", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_RESPONSE, {
				data: '{"id":5}',
				dataType: 2,
				error: '{"name":"SomeError"}',
				id: "12345",
				meta: '{"token":"12345"}',
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			id: "12345",
			data: {
				id: 5
			},
			error: {
				name: "SomeError"
			},
			meta: {
				token: "12345"
			}
		});
	});

	it("check with PACKET_RESPONSE with Buffer", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_RESPONSE, {
				data: Buffer.from("binary data"),
				dataType: 3,
				error: '{"name":"SomeError"}',
				id: "12345",
				meta: '{"token":"12345"}',
				stream: true,
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			id: "12345",
			data: Buffer.from("binary data"),
			error: {
				name: "SomeError"
			},
			meta: {
				token: "12345"
			},
			stream: true
		});
	});

	it("check with PACKET_RESPONSE with stream", () => {
		expect(
			serializer.deserializeCustomFields(P.PACKET_RESPONSE, {
				data: Buffer.from("binary data"),
				dataType: 3,
				error: '{"name":"SomeError"}',
				id: "12345",
				meta: '{"token":"12345"}',
				stream: true,
				sender: "node-1"
			})
		).toEqual({
			sender: "node-1",
			id: "12345",
			data: Buffer.from("binary data"),
			error: {
				name: "SomeError"
			},
			meta: {
				token: "12345"
			},
			stream: true
		});
	});
});
