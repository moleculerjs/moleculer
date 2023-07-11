import type { ActionSchema } from "../service";
import Endpoint = require("./endpoint");
import EndpointList = require("./endpoint-list");
import BrokerNode = require("./node");
import ServiceItem = require("./service-item");

declare namespace ActionCatalog {
	export interface ActionCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withEndpoints?: boolean;
	}

	export interface ActionCatalogListResult {
		name: string;
		count: number;
		hasLocal: boolean;
		available: boolean;
		action?: Omit<ActionSchema, "handler" | "remoteHandler" | "service">;
		endpoints?: Pick<Endpoint, "id" | "state">[];
	}
}

declare class ActionCatalog {
	add(node: BrokerNode, service: ServiceItem, action: ActionSchema): EndpointList;

	get(actionName: string): EndpointList | undefined;

	isAvailable(actionName: string): boolean;

	removeByService(service: ServiceItem): void;

	remove(actionName: string, nodeID: string): void;

	list(opts: ActionCatalog.ActionCatalogListOptions): ActionCatalog.ActionCatalogListResult[];
}

export = ActionCatalog;
