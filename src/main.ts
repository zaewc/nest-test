import 'reflect-metadata';
import { ServerRedis } from '@nestjs/microservices';
import { EventEmitter } from 'node:events';

/**
 * ServerRedis subclass that swaps the real ioredis connections for plain
 * in-memory EventEmitters. This keeps the reproduction self-contained (no
 * Redis server needed) while still running the *actual* listener-wiring code
 * inside ServerRedis#listen() — which is the code path under test.
 */
class ProbeServerRedis extends ServerRedis {
  // Use fake clients instead of real ioredis connections.
  public createRedisClient(): any {
    return new EventEmitter();
  }

  // Skip the real network connect() performed in start().
  public start(callback?: () => void): void {
    callback?.();
  }

  public get sub(): EventEmitter {
    return this.subClient as unknown as EventEmitter;
  }

  public get pub(): EventEmitter {
    return this.pubClient as unknown as EventEmitter;
  }
}

const server = new ProbeServerRedis({} as any);

// Registered BEFORE listen() -> the listener is queued into
// `pendingEventListeners` and later attached to both clients inside listen().
server.on('ready', type => {
  console.log(`  -> listener was told the event came from the "${type}" client`);
});

server.listen(() => {
  console.log('\nEmitting "ready" directly on this.subClient:');
  console.log('  expected type = "sub"');
  server.sub.emit('ready');

  console.log('\nEmitting "ready" directly on this.pubClient:');
  console.log('  expected type = "pub"');
  server.pub.emit('ready');

  console.log(
    '\nActual result: the sub client reports "pub" and the pub client reports "sub" — the labels are swapped.',
  );
  process.exit(0);
});
