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
  timestamp: Date;
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
  static async findMatches(ctxt: TransactionContext<Knex>) {
    var bids = await ctxt.client<OrderBookEntry>('bids').orderBy('price', 'desc')
    var asks = await ctxt.client<OrderBookEntry>('asks').orderBy('price', 'asc')

    let res = [];

    // TODO: Find matches
  
    if ((bids.length > 0) && (asks.length > 0) && (bids[0].price >= asks[0].price)) {
      var taker_order = await ctxt.client<Order>('orders').where( 'id', bids[0].order_id ) // query the taker and maker orders
      var maker_order = await ctxt.client<Order>('orders').where( 'id', asks[0].order_id ) // query the taker and maker orders
      // ctxt.logger.info(taker_order)
      // ctxt.logger.info(maker_order)

      var true_price = (taker_order[0].timestamp > maker_order[0].timestamp) ? taker_order[0].price : maker_order[0].price  // choose the earliest placed order

      res.push({
        size: Math.min(taker_order[0].size, maker_order[0].size),
        price: true_price,
        taker_order_id: taker_order[0].id,
        maker_order_id: maker_order[0].id,
      });
    }
    else {
      ctxt.logger.info('no matches found')
      return;
    }

    return res;
  }

  @Communicator()
  static async sendFills(ctxt: CommunicatorContext, fills: Fill[]) {

  }

  @Transaction()
  static async listOrders(ctxt: TransactionContext<Knex>) {
    var orders = await ctxt.client<OrderBookEntry>('orders').select('*')
    
    return orders
  }

  @Workflow()
  static async placeOrderWorkflow(ctxt: WorkflowContext, order: Order): Promise<string> {
    
    await ctxt.invoke(Hello).insertOrder(order);
    const matches = await ctxt.invoke(Hello).findMatches();
    await ctxt.logger.info(matches);
    const fills:Fill[] = [];
    // var fills = await ctxt.invoke(Hello).findMatches();
    await ctxt.invoke(Hello).sendFills(fills);
    return "foo";
  }

  @GetApi('/listOrders')
  static async listOrderHandler(ctxt: HandlerContext) {
    return await ctxt.invoke(Hello).listOrders();
  }

  @PostApi('/order') 
  static async placeOrderHandler(ctxt: HandlerContext, @ArgSource(ArgSources.BODY) order: Order) {
    const res = await ctxt.invoke(Hello).placeOrderWorkflow(order);
    return res;
  }
}
