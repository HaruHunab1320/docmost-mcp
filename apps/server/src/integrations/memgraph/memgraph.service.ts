import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class MemgraphService implements OnModuleDestroy {
  private readonly logger = new Logger(MemgraphService.name);
  private driver: Driver;

  constructor() {
    const uri = process.env.MEMGRAPH_URI || 'bolt://localhost:7687';
    const user = process.env.MEMGRAPH_USER || '';
    const password = process.env.MEMGRAPH_PASSWORD || '';

    if (user && password) {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    } else {
      this.driver = neo4j.driver(uri);
    }
  }

  getSession(): Session {
    return this.driver.session();
  }

  async onModuleDestroy() {
    try {
      await this.driver.close();
    } catch (error) {
      this.logger.warn('Failed to close Memgraph driver');
    }
  }
}
