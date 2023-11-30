import BaseStrategy = require("../strategies/base");
import Node = require("./node");
import Endpoint = require("./endpoint");
import ActionEndpoint = require("./endpoint-action");
import EventEndpoint = require("./endpoint-event");
import ServiceItem = require("./service-item");
import { Registry, ServiceBroker } from "./event-catalog";
import Context = require("../context");

declare class EndpointList {
    registry: Registry;
    broker: ServiceBroker;
    strategy: typeof BaseStrategy;
    name: string;
    group: string;
    internal: boolean;
    EndPointFactory: typeof Endpoint;
	endpoints: (ActionEndpoint | EventEndpoint)[];
    localEndpoints: (ActionEndpoint | EventEndpoint)[];

	constructor(registry: Registry, broker: ServiceBroker, name: string, group: string, EndPointFactory?: typeof Endpoint, StrategyFactory?: typeof BaseStrategy, strategyOptions?: Record<string, any>);

	add(node: Node, service: ServiceItem, data: any): Endpoint;
	getFirst(): Endpoint | null;
	select(list: Array<Endpoint>, ctx: Context): Endpoint | null;
	next(ctx: Context): Endpoint | null;
	nextLocal(ctx: Context): Endpoint | null;

    hasAvailable(): boolean;
    hasLocal(): boolean;
    setLocalEndpoints(): void;
    count(): number;

	getEndpointByNodeID(nodeID: string): Endpoint | null;
    hasNodeID(nodeID: string): boolean;
    removeByService(service: ServiceItem): void;
    removeByNodeID(nodeID: string): void;
}
export = EndpointList;
