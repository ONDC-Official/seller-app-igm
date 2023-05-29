import axios from "axios";

//TODO Changed the URL from ENV
// const axiosInstance = axios.create({
//   baseURL: "http://localhost:8000/api/client",
//   headers: { "Content-Type": "application/json" },
// });
// const axiosInstance = axios.create({
//   baseURL: "https://7994-115-240-127-98.ngrok-free.app/protocol/v1",
//   headers: { "Content-Type": "application/json" },
// });
const axiosInstance = axios.create({
  baseURL: `${process.env.BPP_URI}/protocol/v1`,
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
