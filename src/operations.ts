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
  static async findMatches(ctxt: TransactionContext<Knex>) {
    var bids = await ctxt.client<OrderBookEntry>('bids').orderBy('price', 'desc')
    var asks = await ctxt.client<OrderBookEntry>('asks').orderBy('price', 'asc')

    let res = [];

    // TODO: Find matches
    const bid_id = bids[0].order_id
    ctxt.logger.info(bid_id)
    // while (bids[0].price >= asks[0].price) {  // should be <=
    //   // const bid_id = bids[0].order_id
    //   // console.log(bid_id)
      // var taker_order = await ctxt.client<OrderBookEntry>('orders').select('*').where({ id: bid_id })// query the taker and maker orders

    //   var true_price = // choose the earliest timestamp

    //   // res.push({
    //   //   size: Math.min( ),
    //   //   price: Math.min(bids[0].price, asks[0].price),
    //   //   taker_order_id: ,
    //   //   maker_order_id: 2,
    //   // });
    // }

    // return res;
  }

  @Communicator()
  static async sendFills(ctxt: CommunicatorContext, fills: Fill[]) {

  }

  @Transaction()
  static async listOrders(ctxt: TransactionContext<Knex>) {
    var orders = await ctxt.client<OrderBookEntry>('orders').select('*')
    
    ctxt.logger.info(orders)

  }

  @Workflow()
  static async placeOrderWorkflow(ctxt: WorkflowContext, order: Order) {

    await ctxt.invoke(Hello).insertOrder(order);
    await ctxt.invoke(Hello).findMatches();
    const fills:Fill[] = [];
    // var fills = await ctxt.invoke(Hello).findMatches();
    return ctxt.invoke(Hello).sendFills(fills);
  }

  @PostApi('/order') 
  static async placeOrderHandler(ctxt: HandlerContext, @ArgSource(ArgSources.BODY) order: Order) {
    await ctxt.invoke(Hello).placeOrderWorkflow(order);
    return;
  }
}
