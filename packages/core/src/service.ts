import type { ServiceBroker } from "./broker";
import { MoleculerComponent } from "./moleculerComponent";

export class Service extends MoleculerComponent {
	public name: string;
	public version?: string | number;
	public fullName: string;

	public constructor(name: string, version?: string) {
		super();
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

	public override init(broker: ServiceBroker): void {
		super.init(broker);
	}

	public async stop(): Promise<void> {
		return Promise.resolve();
	}

	public override async started(): Promise<void> {
		return Promise.resolve();
	}

	public override async stopped(): Promise<void> {
		return Promise.resolve();
	}
}
