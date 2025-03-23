class WebSocketService {
    constructor() {
        this.ws = null;
        this.messageHandlers = new Map();
        this.connect();
    }

    connect() {
        try {
            console.log('Starting WebSocket connection...');
            
            // Create WebSocket connection
            this.ws = new WebSocket('ws://localhost:8000/ws/chat');
            
            this.ws.onopen = () => {
                console.log('WebSocket Connected Successfully');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket message received:', data);
                    const handler = this.messageHandlers.get(data.type);
                    if (handler) {
                        handler(data);
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket Connection Closed');
                console.log("----------------",event)
                console.log('Close Code:', event.code);
                console.log('Close Reason:', event.reason);
                console.log('Clean Close:', event.wasClean);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                console.log('WebSocket State:', {
                    readyState: this.ws.readyState,
                    url: this.ws.url
                });
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
        }
    }

    sendMessage(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                console.log('Sending WebSocket message:', data);
                this.ws.send(JSON.stringify(data));
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
            }
        } else {
            console.warn('WebSocket is not connected. Message not sent:', data);
        }
    }

    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    removeMessageHandler(type) {
        this.messageHandlers.delete(type);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Intentional disconnect');
            this.ws = null;
        }
    }
}

export const wsService = new WebSocketService();
export default wsService; 