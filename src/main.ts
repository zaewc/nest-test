import 'reflect-metadata';
import { ServerRedis } from '@nestjs/microservices';
import { EventEmitter } from 'node:events';

class ProbeServerRedis extends ServerRedis {
  public createRedisClient(): any {
    return new EventEmitter();
  }

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
