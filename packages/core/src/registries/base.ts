import type { ServiceBroker } from "../broker";
import type { Service } from "../service";

export interface StrategyTypes {}

export interface BaseRegistryOptions {
	preferLocal: boolean;
	strategy: StrategyTypes[keyof StrategyTypes];
}

export interface Endpoint {
	// TODO:
}

export abstract class BaseRegistry {
	protected readonly broker: ServiceBroker;
	protected readonly opts: BaseRegistryOptions;

	public constructor(broker: ServiceBroker, opts: BaseRegistryOptions) {
		this.broker = broker;
		this.opts = opts;
	}

	public abstract registerLocalService(service: Service): void;
}
