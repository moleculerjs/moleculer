import type { ServiceBroker } from "../broker";
import type { Context } from "../context";
import type { Endpoint } from "../registries/base";

// It will be augmented by the strategies
export interface StrategyTypes {}

export interface BaseStrategyOptions {
	strategy: StrategyTypes[keyof StrategyTypes];
}

export abstract class BaseStrategy {
	private readonly broker: ServiceBroker;
	private readonly opts: BaseStrategyOptions;

	public constructor(broker: ServiceBroker, opts: BaseStrategyOptions) {
		this.broker = broker;
		this.opts = opts;
	}

	public abstract select(list: Endpoint[], ctx: Context): Endpoint | null;
}
