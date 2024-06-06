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
export class OrderClass {

  

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

    ctxt.logger.info(bids)
    ctxt.logger.info(asks)
    let res = [];

    // TODO: Find matches
  
    if ((bids.length > 0) && (asks.length > 0) && (bids[0].price >= asks[0].price)) {
      var taker_order = await ctxt.client<Order>('orders').where( 'id', bids[0].order_id ) // query the taker and maker orders
      var maker_order = await ctxt.client<Order>('orders').where( 'id', asks[0].order_id ) // query the taker and maker orders

      // ctxt.logger.info(taker_order)
      // ctxt.logger.info("break")
      // ctxt.logger.info(asks[0])
      var true_price = (taker_order[0].timestamp > maker_order[0].timestamp) ? taker_order[0].price : maker_order[0].price  // choose the earliest placed order

      const true_size = Math.min(taker_order[0].size, maker_order[0].size);

      res.push({
        size: true_size,
        price: true_price,
        taker_order_id: taker_order[0].id,
        maker_order_id: maker_order[0].id,
      });

      // await ctxt.client<Order>('orders').where( 'id', (true_size == taker_order[0].size) ? taker_order[0].id : maker_order[0].id ).del();
      await ctxt.client<Order>('orders').where( 'id', taker_order[0].id ).del();
      await ctxt.client<Order>('asks').where( 'order_id', maker_order[0].id ).del();
      await ctxt.client<Order>('orders').where( 'id', maker_order[0].id ).del();   //shoul only reduce size of this order not remove it comepletely
      await ctxt.client<Order>('bids').where( 'order_id', taker_order[0].id ).del();

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

  // @Workflow()
  // static async placeOrderWorkflow(ctxt: WorkflowContext, order: Order) {
    
    
  // }

  @Workflow()
  @PostApi('/order') 
  static async placeOrderHandler(ctxt: WorkflowContext, @ArgSource(ArgSources.BODY) order: Order) {
    await ctxt.invoke(OrderClass).insertOrder(order);
    // const fills:Fill[] = [];
    var fills = await ctxt.invoke(OrderClass).findMatches();
    await ctxt.logger.info(fills);
    // await ctxt.invoke(OrderClass).sendFills(fills);
    // const res = await ctxt.invoke(OrderClass).placeOrderWorkflow(order);
    return fills;
  }

  @GetApi('/listOrders')
  static async listOrderHandler(ctxt: HandlerContext) {
    return await ctxt.invoke(OrderClass).listOrders();
  }

}
