import { Service, ServiceBroker } from "../../src";
import { ServiceSchemaError } from "../../src/errors";

describe("Service schema", () => {
	describe("Create service with schema", () => {
		let broker: ServiceBroker;

		beforeEach(() => {
			broker = new ServiceBroker();
		});

		it("should throw error if schema is null", async () => {
			// @ts-expect-error: Invalid params
			await expect(broker.createService(null)).rejects.toThrow(ServiceSchemaError);
		});

		it("should throw error if name is not defined", async () => {
			// @ts-expect-error: Invalid params
			await expect(broker.createService({})).rejects.toThrow(ServiceSchemaError);
		});

		it("should create with only name", async () => {
			const svc = await broker.createService({ name: "posts" });

			expect(svc).toBeDefined();
			expect(svc).toBeInstanceOf(Service);
			expect(svc.name).toBe("posts");
			expect(svc.version).toBeNull();
			expect(svc.fullName).toBe("posts");

			expect(svc.settings).toEqual({});
			expect(svc.metadata).toEqual({});

			expect(svc.schema).toStrictEqual({ name: "posts" });

			expect(svc.actions).toEqual({});
			expect(svc.events).toEqual({});

			expect(svc.broker).toBe(broker);
			expect(svc.logger).toBeDefined();
		});

		it("should create with full schema", async () => {
			const schema = {
				name: "users",
				version: 2,
				settings: {
					a: 5,
					b: "John",
				},
				metadata: {
					x: 100,
					y: "Jane",
				},

				methods: {
					uppercase(str: string): string {
						return str.toUpperCase();
					},
				},
			};
			const svc = await broker.createService(schema);

			expect(svc).toBeDefined();
			expect(svc).toBeInstanceOf(Service);
			expect(svc.name).toBe("users");
			expect(svc.version).toBe(2);
			expect(svc.fullName).toBe("v2.users");

			expect(svc.settings).toStrictEqual({
				a: 5,
				b: "John",
			});
			expect(svc.metadata).toStrictEqual({
				x: 100,
				y: "Jane",
			});

			expect(svc.schema).toStrictEqual(schema);

			// @ts-expect-error: Need to fix
			expect(svc.uppercase).toBe(Function);

			expect(svc.actions).toEqual({});
			expect(svc.events).toEqual({});

			expect(svc.broker).toBe(broker);
			expect(svc.logger).toBeDefined();
		});

		it("should create with string version", async () => {
			const svc = await broker.createService({
				name: "config",
				version: "stage",
			});

			expect(svc).toBeDefined();
			expect(svc).toBeInstanceOf(Service);
			expect(svc.name).toBe("config");
			expect(svc.version).toBe("stage");
			expect(svc.fullName).toBe("stage.config");
		});
	});

	describe("Test service lifecycle handlers", () => {
		it("should call simple lifecycle handlers", async () => {
			const broker = new ServiceBroker();

			const schema = {
				name: "users",
				merged: jest.fn(),
				created: jest.fn(),
				started: jest.fn(),
				stopped: jest.fn(),
			};

			await broker.createService(schema);

			expect(schema.merged).toHaveBeenCalledTimes(1);
			expect(schema.merged).toHaveBeenCalledWith(schema);

			expect(schema.created).toHaveBeenCalledTimes(1);
			expect(schema.created).toHaveBeenCalledWith();

			expect(schema.started).toHaveBeenCalledTimes(0);
			expect(schema.stopped).toHaveBeenCalledTimes(0);

			await broker.start();

			expect(schema.merged).toHaveBeenCalledTimes(1);
			expect(schema.created).toHaveBeenCalledTimes(1);

			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(schema.started).toHaveBeenCalledWith();

			expect(schema.stopped).toHaveBeenCalledTimes(0);

			await broker.stop();

			expect(schema.merged).toHaveBeenCalledTimes(1);
			expect(schema.created).toHaveBeenCalledTimes(1);
			expect(schema.started).toHaveBeenCalledTimes(1);

			expect(schema.stopped).toHaveBeenCalledTimes(1);
			expect(schema.stopped).toHaveBeenCalledWith();
		});

		it("should call multiple lifecycle handlers", async () => {
			const broker = new ServiceBroker();

			const schema = {
				name: "users",
				merged: [jest.fn(), jest.fn()],
				created: [jest.fn(), jest.fn()],
				started: [jest.fn(), jest.fn()],
				stopped: [jest.fn(), jest.fn()],
			};

			await broker.createService(schema);

			expect(schema.merged[0]).toHaveBeenCalledTimes(1);
			expect(schema.merged[0]).toHaveBeenCalledWith(schema);
			expect(schema.merged[1]).toHaveBeenCalledTimes(1);
			expect(schema.merged[1]).toHaveBeenCalledWith(schema);

			expect(schema.created[0]).toHaveBeenCalledTimes(1);
			expect(schema.created[0]).toHaveBeenCalledWith();
			expect(schema.created[1]).toHaveBeenCalledTimes(1);
			expect(schema.created[1]).toHaveBeenCalledWith();

			expect(schema.started[0]).toHaveBeenCalledTimes(0);
			expect(schema.started[1]).toHaveBeenCalledTimes(0);
			expect(schema.stopped[0]).toHaveBeenCalledTimes(0);
			expect(schema.stopped[1]).toHaveBeenCalledTimes(0);

			await broker.start();

			expect(schema.merged[0]).toHaveBeenCalledTimes(1);
			expect(schema.merged[1]).toHaveBeenCalledTimes(1);
			expect(schema.created[0]).toHaveBeenCalledTimes(1);
			expect(schema.created[1]).toHaveBeenCalledTimes(1);

			expect(schema.started[0]).toHaveBeenCalledTimes(1);
			expect(schema.started[0]).toHaveBeenCalledWith();
			expect(schema.started[1]).toHaveBeenCalledTimes(1);
			expect(schema.started[1]).toHaveBeenCalledWith();

			expect(schema.stopped[0]).toHaveBeenCalledTimes(0);
			expect(schema.stopped[1]).toHaveBeenCalledTimes(0);

			await broker.stop();

			expect(schema.merged[0]).toHaveBeenCalledTimes(1);
			expect(schema.merged[1]).toHaveBeenCalledTimes(1);
			expect(schema.created[0]).toHaveBeenCalledTimes(1);
			expect(schema.created[1]).toHaveBeenCalledTimes(1);
			expect(schema.started[0]).toHaveBeenCalledTimes(1);
			expect(schema.started[1]).toHaveBeenCalledTimes(1);

			expect(schema.stopped[0]).toHaveBeenCalledTimes(1);
			expect(schema.stopped[0]).toHaveBeenCalledWith();
			expect(schema.stopped[1]).toHaveBeenCalledTimes(1);
			expect(schema.stopped[1]).toHaveBeenCalledWith();
		});
	});
});
