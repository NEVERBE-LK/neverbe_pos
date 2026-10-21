import axios from "axios";
import { auth } from "@/firebase/firebaseClient";

const API_BASE_URL = import.meta.env.PROD
  ? "https://api.neverbe.lk"
  : "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor — auto-inject Firebase auth token & set Content-Type
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set the correct Content-Type for FormData (multipart/form-data with boundary)
    const isFormData = config.data instanceof FormData || (config.data && typeof config.data.append === 'function');
    if (!isFormData) {
      config.headers["Content-Type"] = "application/json";
    } else {
      // Ensure Content-Type is NOT set for FormData so the browser/axios sets it with boundary
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — unwrap data, handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Network error";
    console.error(`[API Error${status ? ` ${status}` : ""}]`, message);

    const enhancedError = new Error(message) as any;
    enhancedError.response = error.response;
    enhancedError.status = status;
    return Promise.reject(enhancedError);
  },
);

export default api;
