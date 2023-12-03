import type { ActionHandler, ActionSchema, EventSchema } from "./service";
import type { CallingOptions } from "./service-broker";
import type Service = require("./service");
import type ServiceBroker = require("./service-broker");

declare namespace MiddlewareHandler {
	export type CallMiddlewareHandler = (
		actionName: string,
		params: any,
		opts: CallingOptions
	) => Promise<any>;

	export type Middleware = {
		[name: string]:
			| ((handler: ActionHandler, action: ActionSchema) => any)
			| ((handler: ActionHandler, event: EventSchema) => any)
			| ((handler: ActionHandler) => any)
			| ((service: Service) => any)
			| ((broker: ServiceBroker) => any)
			| ((handler: CallMiddlewareHandler) => CallMiddlewareHandler);
	};

	export type MiddlewareInit = (broker: ServiceBroker) => Middleware;
	export interface MiddlewareCallHandlerOptions {
		reverse?: boolean;
	}
}

declare class MiddlewareHandler {
	broker: ServiceBroker;
	list: MiddlewareHandler.Middleware[];
	registeredHooks: Record<string, Function>;

	constructor(broker: ServiceBroker);

	add(mw: string | MiddlewareHandler.Middleware | MiddlewareHandler.MiddlewareInit): void;

	wrapHandler(method: string, handler: Function, def: ActionSchema): typeof handler;

	callHandlers(
		method: string,
		args: any[],
		opts?: MiddlewareHandler.MiddlewareCallHandlerOptions
	): Promise<void>;

	callSyncHandlers(
		method: string,
		args: any[],
		opts?: MiddlewareHandler.MiddlewareCallHandlerOptions
	): any[];

	count(): number;

	wrapMethod(
		method: string,
		handler: Function,
		bindTo?: any,
		opts?: MiddlewareHandler.MiddlewareCallHandlerOptions
	): typeof handler;
}
export = MiddlewareHandler;
