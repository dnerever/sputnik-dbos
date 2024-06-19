import { GetApi, HandlerContext, PostApi } from "@dbos-inc/dbos-sdk";
import path from 'path';
import Koa from 'koa';
import { ShopUtilities } from "./utilities";
import { Liquid } from "liquidjs";
import { Order } from "./operations"

const exampleMiddleware: Koa.Middleware = async (ctx, next) => {
    console.log(ctx.request.req);
    await next();
};

// import { bodyParser } from "@koa/bodyparser";
// import { KoaBodyParser } from '@dbos-inc/dbos-sdk';

// @KoaBodyParser(bodyParser({
//     extendTypes: {
//       json: ["application/json", "application/custom-content-type"],
//     },
//     encoding: "utf-8"
// }))

interface FormData {
    trader: BigInteger;
    side: String;
    price: number;
    size: number;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// This engine makes cleans up the path and name of each liquid file
const liquidEngine = new Liquid({
  root: path.resolve(__dirname, '..', 'public'),
  extname: ".liquid"
});

// create a render function using the liquid engine
async function render(file: string, ctx?: object): Promise<string> {
  return await liquidEngine.renderFile(file, ctx) as string;
}

export class Frontend {

    @GetApi('/')
    static async frontend(ctxt: HandlerContext) {
        const buys = await ctxt.invoke(ShopUtilities).returnOrders();
    
        //note: "orderDisplay" is the filename minus the extension of the liquid template
        return await render("orderDisplay", {
            orders: buys,
        });
    }

    @GetApi('/order')
    static async order(ctxt: HandlerContext) {
        // const 
        return await render("placeOrder");
    }

    // @PostApi('/submitFormData')
    // static async submitFormData(ctxt: HandlerContext) {
    //     const formData = ctxt.body;

    //     try {
    //         console.log('Received form data:', formData);
    //         return { success: true, message: 'form data received successfully' };
    //     } catch (e) {
    //         console.error('Error handling form data:', e);
    //         return { success: false, error: 'Failed to handle form data' };
    //     }
    // }

    // @GetApi('/order2')
    // static async order2(ctxt: HandlerContext) {
    //     // const 
    //     return await render("placeOrder");
    // }

//   @GetApi('/payment/:key')
//   static payment(_ctxt: HandlerContext, key: string) {
//     return render("payment", {
//       uuid: key,
//     });
//   }
  
//   @GetApi('/error')
//   static error(_ctxt: HandlerContext) {
//     return render("error", {});
//   }

//   @GetApi('/crash')
//   static crash(_ctxt: HandlerContext) {
//     return render("crash", {});
//   }

//   @GetApi('/order/:order_id')
//   static async order(ctxt: HandlerContext, order_id: number) {
//     const order = await ctxt.invoke(ShopUtilities).retrieveOrder(order_id);
//     return await render("order_status", {
//       order_id: order.order_id,
//       status: OrderStatus[order.order_status],
//       time: order.last_update_time
//     });
//   }
  
}