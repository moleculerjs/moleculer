import BaseStrategy = require("./base");

import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare namespace CpuUsageStrategy {
	export interface CpuUsageStrategyOptions {
		sampleCount?: number;
		lowCpuUsage?: number;
	}
}

declare class CpuUsageStrategy extends BaseStrategy {

	constructor(registry: Registry, broker: ServiceBroker, opts?: CpuUsageStrategy.CpuUsageStrategyOptions);

	opts: CpuUsageStrategy.CpuUsageStrategyOptions;

	select(list: Endpoint[]): Endpoint;

}
export = CpuUsageStrategy;
