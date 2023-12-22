import { Sequelize } from "sequelize";
import "dotenv/config";

const sequelize = new Sequelize(
  process.env.CLIENT_PG_DATABASE || "seller_client",
  process.env.CLIENT_PG_USER || "bpp_client",
  process.env.CLIENT_PG_PASSWORD || "bpp_client",
  {
    host: process.env.PG_HOST,
    dialect: "postgres",
  }
);

// const sequelize = new Sequelize("postgres", "strapi", "strapi", {
//   host: "postgres",
//   dialect: "postgres",
// });

export default sequelize;
