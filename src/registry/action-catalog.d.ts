import type { ActionSchema } from "../service";
import Endpoint = require("./endpoint");
import EndpointList = require("./endpoint-list");
import Node = require("./node");
import ServiceItem = require("./service-item");

import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Strategy = require("../strategies/base");
import ActionEndpoint = require("./endpoint-action");

declare namespace ActionCatalog {
	export interface ActionCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withEndpoints?: boolean;
	}

	interface ActionEndpointList {
		nodeID: string;
		state: boolean;
		available: boolean;
	}

	export interface ActionCatalogListResult {
		name: string;
		count: number;
		hasLocal: boolean;
		available: boolean;
		action?: Omit<ActionSchema, "handler" | "remoteHandler" | "service">;
		endpoints?: ActionEndpointList[];
	}
}

declare class ActionCatalog {
	registry: Registry;
	broker: ServiceBroker;
	actions: Map<string, any>;
	StrategyFactory: Strategy;
	EndpointFactory: typeof ActionEndpoint;

	constructor(registry: Registry, broker: ServiceBroker, StrategyFactory: typeof Strategy);

	add(node: Node, service: ServiceItem, action: ActionSchema): EndpointList;

	get(actionName: string): EndpointList | undefined;

	isAvailable(actionName: string): boolean;

	removeByService(service: ServiceItem): void;

	remove(actionName: string, nodeID: string): void;

	list(opts: ActionCatalog.ActionCatalogListOptions): ActionCatalog.ActionCatalogListResult[];
}

export = ActionCatalog;
