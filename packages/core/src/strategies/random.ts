import type { Endpoint } from "../registries/base";
import type { BaseStrategyOptions } from "./base";
import { BaseStrategy } from "./base";

declare module "../registries/base" {
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
