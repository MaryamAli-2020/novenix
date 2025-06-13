import axios from 'axios';

const isDevelopment = process.env.NODE_ENV !== 'production';
// Update the production URL to point to your backend service
const baseURL = isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://your-backend-service.onrender.com/api'; // Change to your actual backend URL
const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': 'true',
    },
    withCredentials: true,
    timeout: 30000,
});

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Remove CORS headers from the request as they should be handled by the server
        delete config.headers['Access-Control-Allow-Origin'];
        delete config.headers['Access-Control-Allow-Credentials'];

        console.log('API Request:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data
        });
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(new Error('Failed to send request. Please check your internet connection.'));
    }
);

// Add a response interceptor to handle auth errors and network issues
api.interceptors.response.use(
    (response) => {
        console.log('API Response:', {
            url: response.config.url,
            status: response.status,
            data: response.data
        });
        return response;
    },
    async (error) => {
        console.error('API Error Details:', {
            config: error.config,
            response: error.response,
            message: error.message
        });

        const originalRequest = error.config;

        if (!error.response) {
            // Network error
            console.error('Network error:', error);
            return Promise.reject(new Error('Server is not responding. Please try again later.'));
        }

        // Handle token expiration
        if (error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                try {
                    const token = await new Promise<string>((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    });
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return api(originalRequest);
                } catch (err) {
                    return Promise.reject(err);
                }
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh the token
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }

                const res = await api.post('/auth/refresh', { token });
                const { token: newToken } = res.data;

                localStorage.setItem('token', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                processQueue(null, newToken);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(new Error('Session expired. Please login again.'));
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response.status === 403) {
            return Promise.reject(new Error('You do not have permission to perform this action.'));
        }

        if (error.response.status === 404) {
            return Promise.reject(new Error('The requested resource was not found.'));
        }

        if (error.response.status >= 500) {
            return Promise.reject(new Error('Server error. Please try again later.'));
        }

        // Handle validation errors
        if (error.response.data?.errors) {
            const messages = Object.values(error.response.data.errors).join('. ');
            return Promise.reject(new Error(messages));
        }

        // Default error message
        const errorMessage = error.response.data?.message || 'An unexpected error occurred.';
        console.error('API Error:', errorMessage);
        return Promise.reject(new Error(errorMessage));
    }
);

export default api; 