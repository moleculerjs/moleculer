import type BaseStrategy = require("../strategies/base");
import type Node = require("./node");
import type Endpoint = require("./endpoint");
import type ActionEndpoint = require("./endpoint-action");
import type EventEndpoint = require("./endpoint-event");
import type ServiceBroker = require("../service-broker");
import type Registry = require("./registry");

import type ServiceItem = require("./service-item");
import type Context = require("../context");

declare class EndpointList<TEndpoint extends Endpoint = Endpoint> {
	registry: Registry;
	broker: ServiceBroker;
	strategy: typeof BaseStrategy;
	name: string;
	group: string;
	internal: boolean;
	EndPointFactory: TEndpoint; //typeof Endpoint;
	endpoints: TEndpoint[];
	localEndpoints: TEndpoint[];

	constructor(
		registry: Registry,
		broker: ServiceBroker,
		name: string,
		group: string,
		EndPointFactory?: typeof ActionEndpoint | typeof EventEndpoint,
		StrategyFactory?: typeof BaseStrategy,
		strategyOptions?: Record<string, any>
	);

	add(node: Node, service: ServiceItem, data: any): TEndpoint;
	getFirst(): Endpoint | null;
	select(list: Array<TEndpoint>, ctx: Context): TEndpoint | null;
	next(ctx: Context): TEndpoint | null;
	nextLocal(ctx?: Context): TEndpoint | null;

	hasAvailable(): boolean;
	hasLocal(): boolean;
	setLocalEndpoints(): void;
	count(): number;

	getEndpointByNodeID(nodeID: string): TEndpoint | null;
	hasNodeID(nodeID: string): boolean;
	removeByService(service: ServiceItem): void;
	removeByNodeID(nodeID: string): void;
}
export = EndpointList;
