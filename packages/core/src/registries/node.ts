import type { Nullable } from "../helperTypes";
import type { ServiceInfo } from "../service";
import type { ActionDefinition } from "../serviceSchema";

export interface NodeInfo {
	instanceID: string;
	hostname?: string;
	port?: number;
	client?: {
		type?: string;
		version?: string;
		langVersion?: string;
	};
	ipList?: string[];
	metadata?: Record<string, unknown>;
	seq: number;

	services?: ServiceInfo<Record<string, unknown>, Record<string, unknown>>[];
}

export class Node {
	public readonly id: string;
	public info: Nullable<NodeInfo> = null;
	public readonly local: boolean;

	public constructor(id: string, local = false) {
		this.id = id;
		this.local = local;
	}

	public updateInfo(info: NodeInfo): void {
		this.info = info;
	}

	public findAction(actionName: string): ActionDefinition | undefined {
		return this.info?.services?.find((svc) => {
			return svc.actions?.[actionName];
		});
	}
}
