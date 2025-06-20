import { expectType } from "tsd";
import {
	Service,
	ServiceBroker,
	ServiceSchema,
	ServiceSettingSchema,
} from "../../../index";

// set up some test globals
const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
interface ExtendedSettings extends ServiceSettingSchema {
	foo: string;
}

// test that ServiceSchema uses default service settings schema
const testSettingsSchema1: ServiceSchema<ExtendedSettings> = {
	name: 'testSchema1',
	settings: {
		foo: 'bar',
	},
};
expectType<ExtendedSettings>(testSettingsSchema1.settings!); // assert non-null to avoid undefined check

// test that service gets default service settings schema
class TestService1 extends Service<ExtendedSettings> {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: 'testService1',
			settings: {
				foo: 'bar',
			},
		});
	}
}
const testService1 = new TestService1(broker);
expectType<ExtendedSettings>(testService1.settings);
expectType<ServiceSchema<ExtendedSettings>>(testService1.schema);

