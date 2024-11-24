import type { ServiceBroker } from "../broker";
import type { Endpoint } from "../registries/base";
import type { BaseStrategyOptions } from "./base";
import { BaseStrategy } from "./base";

declare module "../registries/base" {
	interface StrategyTypes {
		roundRobin: "RoundRobin";
		roundRobinObj: {
			type: "RoundRobin";
			options?: Partial<BaseStrategyOptions>;
		};
	}
}

export class RoundRobinStrategy extends BaseStrategy {
	private counter = 0;

	public constructor(broker: ServiceBroker, opts: BaseStrategyOptions) {
		super(broker, opts);
	}

	public select(list: Endpoint[]): Endpoint | null {
		if (list.length === 0) return null;
		if (list.length === 1) return list[0];

		if (this.counter >= list.length) {
			this.counter = 0;
		}
		return list[this.counter++];
	}
}
