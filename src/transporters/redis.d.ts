import type { Redis, Cluster, ClusterNode, ClusterOptions, RedisOptions } from "ioredis";
import BaseTransporter = require("./base");

declare namespace RedisTransporter {
	export interface RedisTransporterOptions {
		cluster?: {
			nodes?: ClusterNode[];
			clusterOptions?: ClusterOptions;
		}
	}
}

declare class RedisTransporter extends BaseTransporter {
	opts: RedisTransporter.RedisTransporterOptions;

	hasBuiltInBalancer: boolean;
	clientPub: any;
	clientSub: any;

	constructor(opts?: string | RedisOptions | RedisTransporter.RedisTransporterOptions);

	getRedisClient(opts): Redis|Cluster;

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;
	unsubscribeFromBalancedCommands(): Promise<void>;

	send(topic: string, data: Buffer): Promise<void>;

}
export = RedisTransporter;
