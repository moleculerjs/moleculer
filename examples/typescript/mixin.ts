import { ServiceSchema } from '../../';

export type MixinMethods = {
	uppercase(text: string): string;
};

const myMixin: Partial<ServiceSchema> = {
	methods: {
		uppercase(text: string): string {
			return text.toUpperCase();
		}
	}
}

export default myMixin;
