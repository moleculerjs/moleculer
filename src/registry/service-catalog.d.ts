import type { ActionSchema } from "../service";
import type { ServiceEvent, ServiceDependency } from "../service";

import BrokerNode = require("./node");
import ServiceItem = require("./service-item");

import ServiceBroker = require("../service-broker");
import Registry = require("./registry");

declare namespace ServiceCatalog {
	export interface ServiceCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withActions?: boolean;
		withEvents?: boolean;
		grouping?: boolean;
	}

	export interface ServiceCatalogListResult {
		name: string;
		version: string | number;
		fullName: string;
		settings: Record<string, any>;
		metadata: Record<string, any>;

		local: boolean;
		available: boolean;
		nodes?: string[];
		nodeID?: string;

		action?: Omit<ActionSchema, "handler" | "remoteHandler" | "service">;
		events?: Omit<ServiceEvent, "handler" | "remoteHandler" | "service">;
	}

	export interface ServiceCatalogLocalNodeServicesResult {
		name: string;
		version: string | number;
		fullName: string;
		settings: Record<string, any>;
		metadata: Record<string, any>;
		dependencies: string | ServiceDependency | (string | ServiceDependency)[];

		action: Record<string, Omit<ActionSchema, "handler" | "remoteHandler" | "service">>;
		events: Record<string, Omit<ServiceEvent, "handler" | "remoteHandler" | "service">>;
	}
}

declare class ServiceCatalog {
	registry: Registry;
    broker: ServiceBroker;
	services: ServiceItem[];

	constructor(registry: Registry, broker: ServiceBroker);

	add(node: BrokerNode, service: ServiceItem, local: boolean): ServiceItem;

	has(fullName: string, nodeID: string): boolean;
    get(fullName: string, nodeID: string): ServiceItem;

	list(opts: ServiceCatalog.ServiceCatalogListOptions): ServiceCatalog.ServiceCatalogListResult[];

    getLocalNodeServices(): ServiceCatalog.ServiceCatalogLocalNodeServicesResult[];

    removeAllByNodeID(nodeID: string): void;
    remove(fullName: string, nodeID: string): void;

}

export = ServiceCatalog;
