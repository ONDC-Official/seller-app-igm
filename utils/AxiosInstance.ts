import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://9ad5-115-240-127-98.ngrok-free.app/protocol/v1",
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
