import axios from "axios";


//TODO Changed the URL from ENV

// export const axiosInstanceInternal = axios.create({
//   baseURL: "http://seller-app:3019/",
//   headers: { "Content-Type": "application/json" },
// });

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/client",
  headers: { "Content-Type": "application/json" },
});

export default axiosInstance;
