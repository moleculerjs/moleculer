import type { Endpoint } from "../registries/base.ts";
import type { BaseStrategyOptions } from "./base.ts";
import { BaseStrategy } from "./base.ts";

declare module "../registries/base.ts" {
	interface StrategyTypes {
		random: "Random";
		randomObj: {
			type: "Random";
			options?: Partial<BaseStrategyOptions>;
		};
	}
}

export class RandomStrategy extends BaseStrategy {
	public select(list: Endpoint[]): Endpoint | null {
		if (list.length === 0) return null;
		if (list.length === 1) return list[0];

		const index = Math.floor(Math.random() * list.length);
		return list[index];
	}
}
