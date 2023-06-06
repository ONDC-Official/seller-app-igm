import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const axiosInstance = axios.create({
  baseURL: `${process.env.PROTOCOL_BASE_URL}/protocol/v1`,
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
