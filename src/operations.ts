import { TransactionContext, CommunicatorContext, Transaction, GetApi, ArgSource, ArgSources, PostApi, Workflow, Communicator, WorkflowContext } from '@dbos-inc/dbos-sdk';
import { Knex } from 'knex';

// The schema of the database table used in this example.

enum Side {
  Buy, Sell
}
export interface Order {
  id: number;
  side: Side;
  price: number;
  size: number;
  trader: number;
}

export interface Fill {

}

export class Hello {


  @Transaction()
  static async insertOrder(ctxt: TransactionContext<Knex>, order: Order) {

  }

  @Transaction()
  static async findMatches(ctxt: TransactionContext<Knex>): Promise<Fill[]> {
    return [];
  }

  @Communicator()
  static async sendFills(ctxt: CommunicatorContext, fills: Fill[]) {

  }

  @PostApi('/order') // Serve this function from HTTP GET requests to the /greeting endpoint with 'user' as a path parameter
  @Workflow()  // Run this function as a database transaction
  static async helloTransaction(ctxt: WorkflowContext, @ArgSource(ArgSources.BODY) order: Order) {
    // Retrieve and increment the number of times this user has been greeted.

    await ctxt.invoke(Hello).insertOrder(order);
    var fills = await ctxt.invoke(Hello).findMatches();
    ctxt.invoke(Hello).sendFills(fills);
  }
}
