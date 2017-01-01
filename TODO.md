# TODO

## Common
- multi params for call & return array
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

## Transporters
- add gzip support

## Cachers
- add lru features t Memory and Redis

## Context
