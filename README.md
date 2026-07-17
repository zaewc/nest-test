# ServerRedis swaps the `pub`/`sub` client type for pre-`listen()` listeners

Minimal reproduction for a bug in `@nestjs/microservices`: event listeners
registered on a Redis microservice *before* it starts listening receive the
wrong `'pub'` / `'sub'` client label.

## Run

```bash
npm install
npm start
```

No Redis server is required — the reproduction swaps the real ioredis
connections for in-memory `EventEmitter`s so it can run anywhere, while still
executing the real listener-wiring code inside `ServerRedis#listen()`.

## What you'll see

```
Emitting "ready" directly on this.subClient:
  expected type = "sub"
  -> listener was told the event came from the "pub" client   <-- wrong

Emitting "ready" directly on this.pubClient:
  expected type = "pub"
  -> listener was told the event came from the "sub" client   <-- wrong
```

## Why

In `packages/microservices/server/server-redis.ts`, `listen()` creates the
clients as `[subClient, pubClient]` but labels index `0` as `'pub'`:

```ts
this.subClient = this.createRedisClient();
this.pubClient = this.createRedisClient();

[this.subClient, this.pubClient].forEach((client, index) => {
  const type = index === 0 ? 'pub' : 'sub'; // index 0 is the SUB client
  ...
  this.pendingEventListeners.forEach(({ event, callback }) =>
    client.on(event, (...args) => callback(type, ...args)),
  );
});
```

So index `0` (the sub client) is labeled `'pub'` and index `1` (the pub
client) is labeled `'sub'`.

The same class's `on()` method maps it the other way around, correctly:

```ts
this.subClient.on(event, (...args) => callback('sub', ...args));
this.pubClient.on(event, (...args) => callback('pub', ...args));
```

`ClientRedis` also gets this right (it builds the array as
`[pubClient, subClient]`, so `index === 0 ? 'pub' : 'sub'` lines up). Only the
`listen()` path in `ServerRedis` is inverted.

## Fix

Swap the ternary in `ServerRedis#listen()`:

```ts
const type = index === 0 ? 'sub' : 'pub';
```
