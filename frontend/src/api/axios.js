import axios from "axios";

const api = axios.create({ baseURL: "/api" });

const getStorage = () =>
  localStorage.getItem("refreshToken") ? localStorage : sessionStorage;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const processQueue = (token) => {
  queue.forEach((cb) => cb(token));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const storage = getStorage();
      const refreshToken = storage.getItem("refreshToken");
      if (!refreshToken) return Promise.reject(error);

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        storage.setItem("accessToken", data.accessToken);
        processQueue(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        storage.removeItem("accessToken");
        storage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
