import type ServiceBroker = require("../service-broker");
import type { ActionHandler, ActionSchema } from "../service";

declare namespace BaseValidator {
	export type ValidatorNames = "Fastest";

	export interface ValidatorOptions {
		type: string;
		options?: GenericObject;
	}
}
declare abstract class BaseValidator {
	constructor();

	init(broker: ServiceBroker): void;

	compile(schema: Record<string, any>): Function;

	validate(params: Record<string, any>, schema: Record<string, any>): boolean;

	middleware(): (handler: ActionHandler, action: ActionSchema) => any;

	convertSchemaToMoleculer(schema: any): Record<string, any>;
}
export = BaseValidator;
