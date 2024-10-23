import type { ServiceBroker } from "./broker";
import { ServiceSchemaError } from "./errors";
import type { ServiceSchema } from "./serviceSchema";

export type ServiceVersion = string | number | null;

export class Service {
	public name: string;
	public version: ServiceVersion;
	public fullName: string;

	protected broker!: ServiceBroker;

	public constructor(name: string, version?: ServiceVersion) {
		this.name = name;
		this.version = version ?? null;
		this.fullName = Service.getVersionedFullName(name, version);
	}

	public static getVersionedFullName(name: string, version?: ServiceVersion): string {
		if (version != null) {
			if (typeof version === "number") {
				return `v${version}.${name}`;
			}
			return `${version}.${name}`;
		}
		return name;
	}

	public static createFromSchema(schema: ServiceSchema): Service {
		if (!schema.name)
			throw new ServiceSchemaError(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?",
				schema,
			);
		const svc = new Service(schema.name, schema.version);

		return svc;
	}

	public async init(broker: ServiceBroker): Promise<void> {
		this.broker = broker;
		return Promise.resolve();
	}

	public async start(): Promise<void> {
		return Promise.resolve();
	}

	public async stop(): Promise<void> {
		return Promise.resolve();
	}
}
