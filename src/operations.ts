import { TransactionContext, CommunicatorContext, Transaction, GetApi, ArgSource, ArgSources, PostApi, Workflow, Communicator, WorkflowContext, HandlerContext, ArgOptional } from '@dbos-inc/dbos-sdk';
import { Knex } from 'knex';
import { KoaMiddleware } from '@dbos-inc/dbos-sdk';
import Koa from 'koa';

// The schema of the database table used in this example.


export interface Order {
  id: number;
  side: string;
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

const exampleMiddleware: Koa.Middleware = async (ctx, next) => {
  console.log(ctx.request.req);
  await next();
};

import { bodyParser } from "@koa/bodyparser";
import { KoaBodyParser } from '@dbos-inc/dbos-sdk';

@KoaBodyParser(bodyParser({
  extendTypes: {
    json: ["application/json", "application/custom-content-type"],
  },
  encoding: "utf-8"
}))
export class Hello {

  

  @Transaction()
  static async insertOrder(ctxt: TransactionContext<Knex>, order: Order) {
    var orders = await ctxt.client<Order>('orders').insert(order).returning('id');
    const orderID = orders[0].id;
    var table = (order.side == 'buy') ? 'bids' : 'asks';

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

  @Workflow()
  static async placeOrderWorkflow(ctxt: WorkflowContext, order: Order) {

    await ctxt.invoke(Hello).insertOrder(order);
    var fills = await ctxt.invoke(Hello).findMatches();
    return ctxt.invoke(Hello).sendFills(fills);
  }

  @PostApi('/order') 
  static async placeOrderHandler(ctxt: HandlerContext, @ArgSource(ArgSources.BODY) order: Order) {
    await ctxt.invoke(Hello).placeOrderWorkflow(order);
    return;
  }
}
