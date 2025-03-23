import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { getChatRequests, respondToRequest, sendChatRequest } from '../services/api';

const ChatRequest = ({ userId, username }) => {
    const [requests, setRequests] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const response = await getChatRequests();
            setRequests(response.data);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    };

    const handleSendRequest = async () => {
        try {
            await sendChatRequest(userId);
            setOpenDialog(false);
        } catch (error) {
            console.error('Error sending request:', error);
        }
    };

    const handleRespond = async (requestId, response) => {
        try {
            await respondToRequest(requestId, response);
            loadRequests();
        } catch (error) {
            console.error('Error responding to request:', error);
        }
    };

    return (
        <>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Chat Requests
                </Typography>
                <List>
                    {requests.map((request) => (
                        <ListItem key={request.id}>
                            <ListItemText
                                primary={`${request.sender.user.username} wants to chat`}
                                secondary={`Status: ${request.status}`}
                            />
                            {request.status === 'pending' && request.receiver.id === userId && (
                                <Box>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => handleRespond(request.id, 'accepted')}
                                        sx={{ mr: 1 }}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => handleRespond(request.id, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            )}
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Send Chat Request</DialogTitle>
                <DialogContent>
                    <Typography>
                        Send a chat request to {username}?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSendRequest} color="primary">
                        Send Request
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ChatRequest; 