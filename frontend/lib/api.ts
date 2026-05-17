import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshFailed = false;

api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't retry refresh calls themselves
        if (originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        // Don't retry if already tried or refresh already failed
        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing && !refreshFailed) {
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                if (data.success && data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                    isRefreshing = false;
                    return api(originalRequest);
                }
            } catch {
                // Refresh failed — clear everything and redirect ONCE
                isRefreshing = false;
                refreshFailed = true;

                localStorage.removeItem('accessToken');

                // Clear the zustand store
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth-storage');

                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/auth')) {
                        window.location.replace('/auth/login');
                    }
                }
            }
        }

        return Promise.reject(error);
    }
);

// Reset refresh failed flag on new navigation
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        refreshFailed = false;
    });
}

export default api;