import type { ServiceBroker } from "../broker.ts";
import type { Endpoint } from "../registries/base.ts";
import type { BaseStrategyOptions } from "./base.ts";
import { BaseStrategy } from "./base.ts";

declare module "../registries/base.ts" {
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
