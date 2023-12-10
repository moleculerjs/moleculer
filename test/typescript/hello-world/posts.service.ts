import { Context, ServiceSchema } from "../../../";

interface PostSettings {
	limit?: number;
}

interface PostListParams {
	limit: number;
	offset: number;
	sort: string;
}

interface PostListResponse {
	rows: any[];
	total: number;
}

interface PostCreatedPayload {
	id: number;
	title: string;
	content: string;
}

export default {
	name: "posts",
	version: 2,

	settings: {
		limit: 5
	},

	actions: {
		list: {
			params: {
				limit: { type: "number", default: 5, convert: true },
				offset: { type: "number", default: 0, convert: true },
				sort: { type: "string", optional: true }
			},
			handler(ctx: Context<PostListParams>) {
				const limit = ctx.params.limit || this.settings.limit;
				this.logger.info(`Lists posts with limit ${limit} and sort ${ctx.params.sort}`);

				return {};
			}
		}
	},

	events: {
		"posts.created"(ctx: Context<PostCreatedPayload>) {
			this.logger.info("New post created:", ctx.params.title);
		}
	},

	created() {
		this.logger.info("Posts service created!");
	},

	started() {
		this.logger.info("Posts service started!");
	},

	stopped() {
		this.logger.info("Posts service stopped!");
	}

} as ServiceSchema<PostSettings>;
