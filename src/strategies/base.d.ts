import type Context = require("../context");
import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry");
import type { Endpoint } from "../registry";

declare abstract class BaseStrategy {
	constructor(registry: Registry, broker: ServiceBroker, opts?: object);

	select(list: any[], ctx?: Context): Endpoint;
}
export = BaseStrategy;
