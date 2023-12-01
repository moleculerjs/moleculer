import type { NodeRawInfo } from "./registry";

declare class Node {
	id: string;
	instanceID: string | null;
	available: boolean;
	local: boolean;
	lastHeartbeatTime: number;
	config: Record<string, any>;
	client: Record<string, any>;
	metadata: Record<string, any> | null;

	ipList: string[] | null;
	port: number | null;
	hostname: string | null;
	udpAddress: string | null;

	rawInfo: Record<string, any> | null;
	services: Record<string, any>[];

	cpu: number | null;
	cpuSeq: number | null;

	seq: number;
	offlineSince: number | null;

	constructor(id: string);

	update(payload: NodeRawInfo, isReconnected: boolean): boolean;
	updateLocalInfo(cpuUsage: Function): Promise<any>;

	heartbeat(payload: Record<string, any>): void;
	disconnected(isUnexpected?: boolean): void;
}
export = Node;
