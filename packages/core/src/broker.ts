import os from "node:os";
import type { BrokerOptions } from "./brokerOptions";
import { generateUUID } from "./utils";

export enum BrokerState {
	CREATED = 1,
	STARTING = 2,
	STARTED = 3,
	STOPPING = 4,
	STOPPED = 5,
}

export class ServiceBroker {
	public options: BrokerOptions;
	public state: BrokerState;

	public namespace: string;
	public nodeID: string;
	public instanceID: string;
	public metadata: Record<string, unknown> = {};

	public constructor(options: BrokerOptions) {
		this.options = options;

		this.namespace = options.namespace ?? "";

		this.nodeID = options.nodeID ?? this.generateNodeID();

		this.instanceID = generateUUID();

		this.state = BrokerState.CREATED;
	}

	private generateNodeID(): string {
		return `${os.hostname().toLowerCase()}-${process.pid}`;
	}

	public async start(): Promise<void> {
		this.state = BrokerState.STARTING;
		// Do something
		this.state = BrokerState.STARTED;
	}

	public async stop(): Promise<void> {
		this.state = BrokerState.STOPPING;
		// Do something
		this.state = BrokerState.STOPPED;
	}
}
