import axios from "axios";

export const axiosInstanceInternal = axios.create({
  baseURL: "http://seller-app:3019/",
  headers: { "Content-Type": "application/json" },
});

const axiosInstance = axios.create({
  baseURL: "https://9ad5-115-240-127-98.ngrok-free.app/protocol/v1",
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
