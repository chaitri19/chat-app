import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add CSRF token to all requests
api.interceptors.request.use(async (config) => {
    try {
        const response = await fetch('http://localhost:8000/api/csrf-token/', {
            credentials: 'include',
        });
        const data = await response.json();
        config.headers['X-CSRFToken'] = data.csrfToken;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
    }
    return config;
});

export const login = (username, password) => {
    return api.post('/login/', { username, password });
};

export const logout = () => {
    return api.post('/logout/');
};

export const getProfiles = () => {
    console.log('Fetching profiles');
    return api.get('/profiles/');
};

export const sendChatRequest = (receiverId) => {
    return api.post(`/profiles/${receiverId}/send_request/`);
};

export const getChatRequests = () => {
    return api.get('/requests/');
};

export const respondToRequest = (requestId, response) => {
    return api.post(`/requests/${requestId}/respond/`, { response });
};

export const getMessages = (userId) => {
    return api.get('/messages/', { params: { user_id: userId } });
};

export const sendMessage = (receiverId, content) => {
    return api.post('/messages/', { receiver_id: receiverId, content });
};

export const markMessageAsRead = (messageId) => {
    return api.post(`/messages/${messageId}/mark_read/`);
};

export const getUnreadCount = () => {
    return api.get('/messages/unread_count/');
};

export const getMutualLikes = () => {
    return api.get('/profiles/mutual_likes/');
};

export default api;