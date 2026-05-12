import type { BrokerOptions, CallingOptions } from "../service-broker";
import type ServiceBroker = require("../service-broker");
import type { ServiceSchema } from "../service";
import type { Middleware } from "../middleware";

export interface CaughtEvent<TPayload = any> {
	name: string;
	payload: TPayload;
	opts?: Record<string, any>;
	type: "emit" | "broadcast" | "broadcastLocal";
	timestamp: number;
}

export interface TestingBroker extends ServiceBroker {
	events: {
		getEvents(): CaughtEvent[];
		clear(): void;
		find(
			expected?: string | RegExp | ((event: CaughtEvent) => boolean)
		): CaughtEvent | undefined;
		waitFor(
			expected?: string | RegExp | ((event: CaughtEvent) => boolean),
			opts?: number | { timeout?: number }
		): Promise<CaughtEvent>;
	};
	mockAction(actionName: string, handler: Function | any): this;
	clearActionMocks(): this;
	getMockedActionCalls(actionName?: string): Array<{
		actionName: string;
		params: any;
		opts: CallingOptions;
		result?: any;
	}>;
}

export interface TestBrokerOptions extends BrokerOptions {
	mockServices?: ServiceSchema[] | Record<string, Partial<ServiceSchema>>;
}

export declare function createBroker(opts?: TestBrokerOptions): TestingBroker;
export declare function EventCatcher(broker: ServiceBroker): Middleware;
export declare function MockingCalls(broker: ServiceBroker): Middleware;
