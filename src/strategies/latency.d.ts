import BaseStrategy = require("./base");

import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare namespace LatencyStrategy {
	export interface LatencyStrategyOptions {
		sampleCount?: number;
		lowLatency?: number;
		collectCount?: number;
		pingInterval?: number;
	}
}

declare class LatencyStrategy extends BaseStrategy {
	constructor(
		registry: Registry,
		broker: ServiceBroker,
		opts?: LatencyStrategy.LatencyStrategyOptions
	);

	opts: LatencyStrategy.LatencyStrategyOptions;

	select(list: Endpoint[]): Endpoint;
}

export = LatencyStrategy;
