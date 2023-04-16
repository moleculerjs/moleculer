declare namespace ActionCatalog {
	export interface ActionCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withEndpoints?: boolean;
	}
}

export = ActionCatalog;
