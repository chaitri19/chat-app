import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    TextField,
    Button,
    Typography,
    Divider,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { getProfiles, sendMessage, getMessages, getUnreadCount, getMutualLikes, sendChatRequest, getChatRequests, respondToRequest } from '../services/api';
import { wsService } from '../services/websocket';

const Chat = () => {
    const [users, setUsers] = useState([]);
    const [nonMutualUsers, setNonMutualUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCounts, setUnreadCounts] = useState({});
    const [pendingRequests, setPendingRequests] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Get current user data
        const userData = localStorage.getItem('user');
        console.log('User data from localStorage:', userData);
        
        if (!userData) {
            console.error('No user data found in localStorage');
            // Optionally redirect to login
            window.location.href = '/login';
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            console.log('Parsed user data:', parsedUser);
            
            if (!parsedUser || !parsedUser.id) {
                throw new Error('Invalid user data format');
            }
            
            setCurrentUser(parsedUser);
            
            // Load data only after we have valid user data
            loadUsers();
            loadUnreadCounts();
            loadPendingRequests();
            setupWebSocket();
        } catch (error) {
            console.error('Error parsing user data:', error);
            // Optionally redirect to login
            window.location.href = '/login';
            return;
        }

        return () => {
            wsService.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadMessages(selectedUser.id);
        }
    }, [selectedUser]);

    // Remove these from the first useEffect since we're now loading them after user data is confirmed
    useEffect(() => {
        if (currentUser) {
            console.log('Current user updated:', currentUser);
            loadPendingRequests();
        }
    }, [currentUser]);

    const setupWebSocket = () => {
        wsService.onMessage('chat_message', handleNewMessage);
        wsService.onMessage('chat_request', handleNewRequest);
        wsService.onMessage('request_response', handleRequestResponse);
    };

    const loadUsers = async () => {
        try {
            // Get mutual likes (users we can chat with)
            const mutualResponse = await getMutualLikes();
            setUsers(mutualResponse.data);

            // Get all other users for sending requests
            const allUsersResponse = await getProfiles();
            const nonMutual = allUsersResponse.data.filter(
                user => !mutualResponse.data.find(mutual => mutual.id === user.id)
            );
            setNonMutualUsers(nonMutual);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadMessages = async (userId) => {
        try {
            const response = await getMessages(userId);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const loadUnreadCounts = async () => {
        try {
            const response = await getUnreadCount();
            setUnreadCounts(response.data);
        } catch (error) {
            console.error('Error loading unread counts:', error);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const response = await getChatRequests();
            console.log('All chat requests:', response.data);
            console.log('Current user:', currentUser);
            
            const filtered = response.data.filter(req => {
                console.log('Checking request:', req);
                console.log('Request receiver:', req.receiver);
                if(req.status === 'pending' && req.receiver?.user?.id === currentUser?.id){
                    console.log("true")
                }else{
                    console.log("false")
                }
                return req.status === 'pending' && 
                       req.receiver?.user?.id === currentUser?.id;
            });
            
            console.log('Filtered pending requests:', filtered);
            setPendingRequests(filtered);
        } catch (error) {
            console.error('Error loading pending requests:', error);
        }
    };

    const handleNewMessage = (data) => {
        if (selectedUser && data.sender_id === selectedUser.id) {
            setMessages(prev => [...prev, data]);
        }
        loadUnreadCounts();
    };

    const handleNewRequest = (data) => {
        // Only add the request if the current user is the receiver
        if (data.receiver?.user?.id === currentUser?.id) {
            setPendingRequests(prev => [...prev, data]);
        }
    };

    const handleRequestResponse = (data) => {
        // Remove request from pending and refresh users list
        setPendingRequests(prev => prev.filter(req => req.id !== data.id));
        loadUsers();
    };

    const handleRespondToRequest = async (requestId, response) => {
        try {
            await respondToRequest(requestId, response);
            // Remove from pending requests
            setPendingRequests(prev => prev.filter(req => req.id !== requestId));
            // Refresh users list to show new mutual connections
            loadUsers();
        } catch (error) {
            console.error('Error responding to request:', error);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await sendChatRequest(userId);
            // Refresh the lists after sending request
            loadUsers();
        } catch (error) {
            console.error('Error sending chat request:', error);
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            await sendMessage(selectedUser.id, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderUserList = () => (
        <List>
            {pendingRequests.length > 0 && (
                <>
                    <Typography variant="h6" sx={{ p: 2 }}>Pending Requests</Typography>
                    {pendingRequests.map((request) => (
                        <ListItem
                            key={request.id}
                            secondaryAction={
                                <Box>
                                    <Button 
                                        variant="contained" 
                                        color="success"
                                        size="small"
                                        sx={{ mr: 1 }}
                                        onClick={() => handleRespondToRequest(request.id, 'accepted')}
                                    >
                                        Accept
                                    </Button>
                                    <Button 
                                        variant="contained" 
                                        color="error"
                                        size="small"
                                        onClick={() => handleRespondToRequest(request.id, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            }
                        >
                            <ListItemText 
                                primary={request.sender?.user?.username} 
                                secondary="Wants to chat with you"
                            />
                        </ListItem>
                    ))}
                    <Divider sx={{ my: 2 }} />
                </>
            )}

            {users.length > 0 && (
                <>
                    <Typography variant="h6" sx={{ p: 2 }}>Chat Contacts</Typography>
                    {users.map((user) => (
                        <ListItemButton
                            key={user.id}
                            selected={selectedUser?.id === user.id}
                            onClick={() => setSelectedUser(user)}
                        >
                            <ListItem>
                                <Badge badgeContent={unreadCounts[user.id] || 0} color="primary">
                                    <ListItemText primary={user.user.username} />
                                </Badge>
                            </ListItem>
                        </ListItemButton>
                    ))}
                    <Divider sx={{ my: 2 }} />
                </>
            )}
            
            {nonMutualUsers.length > 0 && (
                <>
                    <Typography variant="h6" sx={{ p: 2 }}>Send Chat Requests</Typography>
                    {nonMutualUsers.map((user) => (
                        <ListItem
                            key={user.id}
                            secondaryAction={
                                <Button 
                                    variant="contained" 
                                    size="small"
                                    onClick={() => handleSendRequest(user.id)}
                                >
                                    Send Request
                                </Button>
                            }
                        >
                            <ListItemText primary={user.user.username} />
                        </ListItem>
                    ))}
                </>
            )}
        </List>
    );

    return (
        <Box sx={{ height: '100vh', display: 'flex' }}>
            <Grid container>
                <Grid item xs={3}>
                    <Paper sx={{ height: '100%', overflow: 'auto' }}>
                        {renderUserList()}
                    </Paper>
                </Grid>
                <Grid item xs={9}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {selectedUser ? (
                            <>
                                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="h6">
                                        {selectedUser.user.username}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                                    {messages.map((message) => (
                                        <Box
                                            key={message.id}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: message.sender_id === selectedUser.id ? 'flex-start' : 'flex-end',
                                                mb: 2,
                                            }}
                                        >
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    maxWidth: '70%',
                                                    backgroundColor: message.sender_id === selectedUser.id ? 'primary.light' : 'grey.200',
                                                }}
                                            >
                                                <Typography>{message.content}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(message.created_at).toLocaleTimeString()}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    ))}
                                </Box>
                                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <form onSubmit={sendChatMessage}>
                                        <Grid container spacing={1}>
                                            <Grid item xs>
                                                <TextField
                                                    fullWidth
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Type a message..."
                                                />
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    disabled={!newMessage.trim()}
                                                >
                                                    Send
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </form>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary">
                                    Select a user to start chatting
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Chat; 