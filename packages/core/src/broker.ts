import type { BrokerOptions } from "./brokerOptions";

export class ServiceBroker {
	public options: BrokerOptions;

	public constructor(options: BrokerOptions) {
		this.options = options;
	}

	public async start(): Promise<void> {
		// Do something
	}

	public async stop(): Promise<void> {
		// Do something
	}
}
