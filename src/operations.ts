import { TransactionContext, CommunicatorContext, Transaction, GetApi, ArgSource, ArgSources, PostApi, Workflow, Communicator, WorkflowContext, HandlerContext, ArgOptional } from '@dbos-inc/dbos-sdk';
import { Knex } from 'knex';
import { KoaMiddleware } from '@dbos-inc/dbos-sdk';
import Koa from 'koa';
import { ShopUtilities } from './utilities';
import { Frontend } from './frontend';

export { ShopUtilities };
export { Frontend };

// The schema of the database table used in this example.


export interface Order {
  id?: number;
  side: string;
  price: number;
  size: number;
  trader: number;
  timestamp?: Date;
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

      // var true_price = (taker_order[0]?.timestamp > maker_order[0]?.timestamp) ? taker_order[0].price : maker_order[0].price;  // choose the earliest placed order

      // const true_size = Math.min(taker_order[0].size, maker_order[0].size);

      var true_price = 0; // Default value or appropriate fallback

      if (taker_order[0]?.timestamp !== undefined && maker_order[0]?.timestamp !== undefined) {
          true_price = (taker_order[0].timestamp > maker_order[0].timestamp) ? taker_order[0].price : maker_order[0].price;
      } else {
          ctxt.logger.info('Timestamp is undefined for either taker_order or maker_order.');
      }
      
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

  @Transaction()
  static async ordersPrettyPrint(ctxt: TransactionContext<Knex>) {
    // const query = "INSERT INTO OrderBookEntry (name, greet_count) VALUES (?, 1) ON CONFLICT (name) DO UPDATE SET greet_count = dbos_hello.greet_count + 1 RETURNING greet_count;";
    // const { rows } = await ctxt.client.raw(query) as { rows: OrderBookEntry[] };
    // const greet_count = Object.keys(rows).length;
    // return `Hello! You have been greeted ${greet_count} times.\n`;

    const order_rows = await ctxt.client<OrderBookEntry>('orders').select('*')
    const rows = Object.keys(order_rows).length;
    const buy_order_rows = await ctxt.client<Order>('orders').select('*').whereRaw('side = ?',['buy'])
    const buy_order_count = Object.keys(buy_order_rows).length;

    const sell_order_rows = await ctxt.client<Order>('orders').select('*').whereRaw('side = ?',['sell'])
    const sell_order_count = Object.keys(sell_order_rows).length;

    const result = `There are ${rows} open orders.\n
    BUY order count: ${buy_order_count}
    SELL order count: ${sell_order_count}`;

    //todo: replace this text with a true visual table using React or Vue (or liquid)
    
    return result;
  }

  // @Workflow()
  // static async placeOrderWorkflow(ctxt: WorkflowContext, order: Order) {
    
    
  // }

  @Workflow()
  @PostApi('/order') 
  static async placeOrderHandler(ctxt: WorkflowContext, @ArgSource(ArgSources.BODY) order: Order) { //take inputs as arguments
    await ctxt.invoke(OrderClass).insertOrder(order);
    // const fills:Fill[] = [];
    var fills = await ctxt.invoke(OrderClass).findMatches();
    await ctxt.logger.info(fills);
    // await ctxt.invoke(OrderClass).sendFills(fills);
    // const res = await ctxt.invoke(OrderClass).placeOrderWorkflow(order);
    return fills;
  }

  //* Just watched someone else demo their TS/React form. I should try that.
  //* Should switch to developing locally for speed reasons
  @PostApi('/submitFormData')
  static async submitFormData(ctxt: HandlerContext, @ArgSource(ArgSources.BODY) order: Order) {

    try {
      console.log('Received form data:', order);
      return { success: true, message: 'form data received successfully' };
    } catch (e) {
      console.error('Error handling form data:', e);
      return { success: false, error: 'Failed to handle form data' };
    }
  }

  @GetApi('/listOrders')
  static async listOrderHandler(ctxt: HandlerContext) {
    return await ctxt.invoke(OrderClass).listOrders();
  }

  // @GetApi('/ordersPP')
  // static async ordersPrettyPrintHandler(ctxt: HandlerContext) {
  //   return await ctxt.invoke(OrderClass).ordersPrettyPrint();
  // }

  @PostApi('/crash_application')
  static async crashApplication(_ctxt: HandlerContext) {

    // For testing and demo purposes :) 
    process.exit(1);
  }

}
