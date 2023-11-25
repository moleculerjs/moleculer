import BaseStrategy = require("./base");

import type Context = require("../context");
import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare namespace ShardStrategy {
	export interface ShardStrategyOptions {
		shardKey?: string|null;
		vnodes?: number;
		ringSize?: number|null;
		cacheSize?: number;
	}
}

declare class ShardStrategy extends BaseStrategy {

	constructor(registry: Registry, broker: ServiceBroker, opts?: ShardStrategy.ShardStrategyOptions);

	opts: ShardStrategy.ShardStrategyOptions;

	select(list: Endpoint[], ctx: Context): Endpoint;
}

export = ShardStrategy;
