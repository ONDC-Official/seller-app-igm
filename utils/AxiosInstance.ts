import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.PROTOCOL_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
