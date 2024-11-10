import { Service, ServiceBroker } from "../../src";
import { ServiceSchemaError } from "../../src/errors";

describe("Create service with schema", () => {
	it("should throw error if schema is null", async () => {
		const broker = new ServiceBroker();

		// @ts-expect-error: Invalid params
		await expect(broker.createService(null)).rejects.toThrow(ServiceSchemaError);
	});

	it("should throw error if name is not defined", async () => {
		const broker = new ServiceBroker();

		// @ts-expect-error: Invalid params
		await expect(broker.createService({})).rejects.toThrow(ServiceSchemaError);
	});

	it("should create with only name", async () => {
		const broker = new ServiceBroker();

		const svc = await broker.createService({ name: "posts" });

		expect(svc).toBeDefined();
		expect(svc).toBeInstanceOf(Service);
		expect(svc.name).toBe("posts");
		expect(svc.version).toBeNull();
		expect(svc.fullName).toBe("posts");

		expect(svc.settings).toEqual({});
		expect(svc.metadata).toEqual({});

		expect(svc.broker).toBe(broker);

		// expect(svc.actions).toEqual({});
		// expect(svc.events).toEqual({});
	});
});
