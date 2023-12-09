import type ServiceBroker = require("../service-broker");
import type { ActionHandler, ActionSchema } from "../service";

declare namespace BaseValidator {
	export type ValidatorNames = "Fastest";

	export interface ValidatorOptions {
		paramName?: string;
	}

	export type CheckerFunction = Function & { async: boolean };
}

declare abstract class BaseValidator {
	constructor(opts: BaseValidator.ValidatorOptions);

	broker: ServiceBroker;
	opts: BaseValidator.ValidatorOptions;

	init(broker: ServiceBroker): void;

	abstract compile(schema: Record<string, any>): BaseValidator.CheckerFunction;

	abstract validate(params: Record<string, any>, schema: Record<string, any>): boolean;

	abstract convertSchemaToMoleculer(schema: any): Record<string, any>;

	middleware(broker: ServiceBroker);
}
export = BaseValidator;
