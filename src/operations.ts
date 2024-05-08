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

export interface OrderBookEntry {
  order_id: number;
  price: number;
}

export interface Fill {
  size: number;
  price: number;
  taker_order_id: number;
  maker_order_id: number;
}

export class Hello {


  @Transaction()
  static async insertOrder(ctxt: TransactionContext<Knex>, order: Order) {
    var orders = await ctxt.client<Order>('orders').insert(order).returning('id');
    const orderID = orders[0].id;
    var table = (order.side == Side.Buy) ? 'bids' : 'asks';

    await ctxt.client<OrderBookEntry>(table).insert({
      order_id: orderID,
      price: order.price
    })
    return orderID;
  }

  @Transaction()
  static async findMatches(ctxt: TransactionContext<Knex>): Promise<Fill[]> {
    var bids = await ctxt.client<OrderBookEntry>('bids').orderBy('price', 'desc')
    var asks = await ctxt.client<OrderBookEntry>('asks').orderBy('price', 'asc');

    // TODO: Find matches

    return [
      {
        size: 1,
        price: 1,
        taker_order_id: 1,
        maker_order_id: 2,
      }
    ];
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
