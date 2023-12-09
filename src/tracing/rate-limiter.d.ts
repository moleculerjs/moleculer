declare namespace RateLimiter {
	export type RateLimiterOptions = {
		tracesPerSecond?: number;
	};
}

declare class RateLimiter {
	constructor(opts?: RateLimiter.RateLimiterOptions);
	opts: RateLimiter.RateLimiterOptions;
	lastTime: number;
	balance: number;
	maxBalance: any;

	check(cost?: number): boolean;
}

export = RateLimiter;
