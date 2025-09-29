import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { and, count, eq, ilike, asc, like, arrayContains} from "drizzle-orm";
import { Hono } from "hono";
import { html } from "hono/html";
import { db } from "./db.js";
import { product } from "./schema.js";
import { generateHTML } from "./template.js";
import esMain from "es-main";

export const start_server = () => {
  const PORT = process.env.PORT || 3000;
  const app = new Hono();

  function searchPagination(totalPages, currentPage, query) {
    const links = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        links.push(html`<span class="active">${i}</span>`);
      } else {
        links.push(html`
          <a href="/?query=${encodeURIComponent(query)}&page=${i}">${i}</a>
        `);
      }
    }
    return links;
  }

  app.get("/public/*", serveStatic({ root: "./" }));

  app.get("/", async (c) => {
    //call database to get products (video minute 12 shows how to get objects from a query)
    const page = Number(c.req.query("page")) || 1;
    

    const query = c.req.query("query") || "";

    const allProducts = await db.select().from(product).where(like(product.name, "%"+query+"%")).all();


    const numProducts = allProducts.length;

    return c.html(
      generateHTML(
        {
          title: "Store",
          products: allProducts.slice((page-1)*10, page*10),
          paginationLinks: searchPagination(Math.ceil(numProducts/10), page, query),
          status: "",
          query: "",
        }
      )
    );
  });

  // Delete a product
  app.post("/delete", async (c) => {
    const body = await c.req.parseBody();
    const productID = body.productID;

    await db.delete(product).where(eq(product.id, Number(productID)));

    return c.redirect('/');
  });

  // Create a new product
  app.post("/add", async (c) => {
    const body = await c.req.parseBody();

    const productName = body.name;
    const image_url = body.image_url;

    console.log(productName);
    console.log(image_url);
    
    await db.insert(product).values({
      name: productName,
      image_url: image_url,
      deleted: 0
    })


    return c.redirect('/');

  });

  serve({ fetch: app.fetch, port: PORT });
  console.log(`Server is running at http://localhost:${PORT}`);
  return app;
};

if (esMain(import.meta)) {
  start_server();
}
