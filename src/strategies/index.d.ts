import BaseStrategy = require("./base");
import RoundRobinStrategy = require("./round-robin");
import RandomStrategy = require("./random");
import CpuUsageStrategy = require("./cpu-usage");
import LatencyStrategy = require("./latency");
import ShardStrategy = require("./shard");

export {
	BaseStrategy as Base,
	RoundRobinStrategy as RoundRobin,
	RandomStrategy as Random,
	CpuUsageStrategy as CpuUsage,
	LatencyStrategy as Latency,
	ShardStrategy as Shard,
};

export declare function resolve(opts: Record<string, any>|string): typeof BaseStrategy;
export declare function register(name: string, value: BaseStrategy): void;
