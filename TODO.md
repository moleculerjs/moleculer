# TODO

## Common
- request timeout (30s default)
- multi params for multi-call & return array
- plugins (broker.plugin(SomePlugin));
- extract caching to middleware (check performance w & w/o middlewares)
- log level settings in broker. Can set minimum log level ("debug", "info", "warn", "error). 
	- or it can be obj:
		logLevel: {
			BROKER: "debug",
			CTX: "debug",
			NATS: "warn",
			"POSTS-SVC": false
		}


- create d.ts file
- use parambulator in actions (validator.js, joi, ajv, validatorjs, validate.js make benchmark)
	```js
	add: {
		cache: true,
		params: {
			a: {type$:'number'},
			b: {type$:'number', gt$:0}
		},
		handler(ctx) {

		}
	}
	```

- cli tool for generate project & Services
	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js

	- `ices init` - generate an ice-services based project
	- `ices add service` - generate an empty service
	- `ices add middleware` - generate an empty middleware
	- `ices add plugin` - generate an empty plugin

## Services
- service factory & context factory for broker options

## Transporters
- Redis transporter
- websocket
- add gzip support

## Cachers
- add lru features to Memory and Redis

## Context
