import type { ServiceBroker } from "./broker";

export abstract class MoleculerComponent {
	protected broker!: ServiceBroker;

	public init(broker: ServiceBroker): void {
		this.broker = broker;
	}
	public abstract started(broker: ServiceBroker): Promise<void>;
	public abstract stopped(broker: ServiceBroker): Promise<void>;
}
