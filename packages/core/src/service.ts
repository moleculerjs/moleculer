import type { ServiceBroker } from "./broker";

export class Service {
	public name: string;
	public version?: string | number;
	public fullName: string;

	protected broker!: ServiceBroker;

	public constructor(name: string, version?: string) {
		this.name = name;
		this.version = version;
		this.fullName = Service.getVersionedFullName(name, version);
	}

	public static getVersionedFullName(name: string, version?: string | number): string {
		if (version != null) {
			if (typeof version === "number") {
				return `v${version}.${name}`;
			}
			return `${version}.${name}`;
		}
		return name;
	}

	public async start(broker: ServiceBroker): Promise<void> {
		this.broker = broker;
		return Promise.resolve();
	}

	public async stop(): Promise<void> {
		return Promise.resolve();
	}
}
