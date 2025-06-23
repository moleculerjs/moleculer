import { expectType } from "tsd";
import {
	Context,
	Service,
	ServiceBroker,
	ServiceAction,
	ServiceActions,
	ServiceSettingSchema
} from "../../../index";

const broker = new ServiceBroker({ logger: false, transporter: "Fake" });

class TestService extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			actions: {
				foo: {
					async handler(ctx: Context<{a: number}>) {
						expectType<Service<ServiceSettingSchema> & Record<string, any>>(this);
						expectType<ServiceActions>(testService.actions);
						expectType<number>(ctx.params.a);
					}
				},
				bar(ctx: Context<{a: number}>) {
					this.actions.foo(); // check `this` ref in `foo`, should not throw error;

					expectType<Service<ServiceSettingSchema> & Record<string, any>>(this);
					expectType<ServiceActions>(testService.actions);
					expectType<number>(ctx.params.a);
				}
			}
		});
	}
}

const testService = new TestService(broker);

expectType<ServiceActions>(testService.actions);
expectType<ServiceAction>(testService.actions.foo);
expectType<ServiceAction>(testService.actions.bar);
