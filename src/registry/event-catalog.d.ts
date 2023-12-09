import type { ActionSchema } from "../service";
import EndpointList = require("./endpoint-list");
import Node = require("./node");
import ServiceItem = require("./service-item");

import type { EventSchema } from "../service";

import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Context = require("../context");
import Strategy = require("../strategies/base");
import EventEndpoint = require("./endpoint-event");

declare namespace EventCatalog {
	export interface EventCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withEndpoints?: boolean;
	}

	interface EventEndpointList {
		nodeID: string;
		state: boolean;
		available: boolean;
	}

	export interface EventCatalogListResult {
		name: string;
		count: number;
		hasLocal: boolean;
		available: boolean;
		action?: Omit<ActionSchema, "handler" | "remoteHandler" | "service">;
		endpoints?: EventEndpointList[];
	}
}

declare class EventCatalog {
	registry: Registry;
	broker: ServiceBroker;
	events: EndpointList<EventEndpoint>[];
	StrategyFactory: typeof Strategy;
	EndpointFactory: typeof EventEndpoint;

	constructor(registry: Registry, broker: ServiceBroker, StrategyFactory: typeof Strategy);

	add(node: Node, service: ServiceItem, event: EventSchema): EndpointList<EventEndpoint>;

	get(eventName: string, groupName: string): EndpointList<EventEndpoint> | null;

	getBalancedEndpoints(
		eventName: string,
		groups?: string | string[],
		ctx?: Context
	): [EventEndpoint, string][];
	getGroups(eventName: string): string[];
	getAllEndpoints(eventName: string, groupNames?: string[]): EventEndpoint[];

	emitLocalServices(ctx: Context): Promise<any>;
	callEventHandler(ctx: Context): Promise<any>;

	removeByService(service: ServiceItem): void;
	remove(eventName: string, nodeID: string): void;

	list(opts: EventCatalog.EventCatalogListOptions): EventCatalog.EventCatalogListResult[];
}

export = EventCatalog;
