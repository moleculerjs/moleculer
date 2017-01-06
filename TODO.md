# TODO

## Common
- request timeout (30s default)
- multi params for multi-call & return array
- plugins (broker.plugin(SomePlugin));
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

## Services
- service factory & context factory for broker options

## Transporters
- Redis transporter
- add gzip support

## Cachers
- add lru features to Memory and Redis

## Context
