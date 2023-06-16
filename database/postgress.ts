import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

console.log("process.env.PG_DATABASE", process.env.PG_DATABASE);
console.log("process.env.PG_USER", process.env.PG_USER);
console.log("process.env.PG_PASSWORD", process.env.PG_PASSWORD);
console.log("process.env.PG_HOST", process.env.PG_HOST);

// const sequelize = new Sequelize(
//   `${process.env.PG_DATABASE}`,
//   `${process.env.PG_USER}`,
//   `${process.env.PG_PASSWORD}`,
//   {
//     host: process.env.PG_HOST,
//     dialect: "postgres",
//   }
// );

const sequelize = new Sequelize("postgres", "strapi", "strapi", {
  host: "postgres",
  dialect: "postgres",
});

export default sequelize;
