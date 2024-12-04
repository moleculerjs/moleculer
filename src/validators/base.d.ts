import type ServiceBroker = require("../service-broker");
import type { ActionHandler, ActionSchema } from "../service";
import type Context from "../context";

declare namespace BaseValidator {
	export type ValidatorNames = "Fastest";

	export interface ValidatorOptions {
		paramName?: string;
	}

	type CheckerFunctionBase = (params: Record<string, unknown>, opts?: { meta: { ctx: Context } }) => boolean | Promise<boolean>
	export type CheckerFunction = CheckerFunctionBase & { async?: boolean };
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
