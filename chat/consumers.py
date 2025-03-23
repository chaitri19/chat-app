import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import UserProfile, ChatRequest, Message
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info("WebSocket connect called")
        
        # Get the user from scope
        self.user = self.scope["user"]
        logger.info(f"User from scope: {self.user}")
        
        if self.user.is_anonymous:
            logger.warning("Anonymous user - closing connection")
            await self.close()
            return

        try:
            # Get or create user profile
            self.user_profile = await self.get_user_profile()
            logger.info(f"Got user profile for: {self.user.username}")
            
            # Set up personal channel
            self.room_group_name = f"user_{self.user.id}"
            logger.info(f"Room group name: {self.room_group_name}")

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            logger.info("Added to channel group")

            await self.accept()
            logger.info("Connection accepted")

        except Exception as e:
            logger.error(f"Error in connect: {str(e)}")
            await self.close()
            return

    @database_sync_to_async
    def get_user_profile(self):
        profile, created = UserProfile.objects.get_or_create(user=self.user)
        return profile

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnect called with code: {close_code}")
        try:
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                logger.info("Removed from channel group")
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}")

    async def receive(self, text_data):
        logger.info(f"Received message: {text_data}")
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'chat_request':
                await self.handle_chat_request(data)
            elif message_type == 'request_response':
                await self.handle_request_response(data)
            
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")

    async def chat_message(self, event):
        try:
            await self.send(text_data=json.dumps(event))
            logger.info("Message sent successfully")
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")

    async def handle_chat_message(self, data):
        try:
            message = {
                'type': 'chat_message',
                'message': data.get('message', ''),
                'sender': self.user.username
            }
            await self.channel_layer.group_send(
                self.room_group_name,
                message
            )
            logger.info("Chat message handled successfully")
        except Exception as e:
            logger.error(f"Error handling chat message: {str(e)}")

    async def handle_chat_request(self, data):
        try:
            request = {
                'type': 'chat_request',
                'sender': self.user.username
            }
            await self.channel_layer.group_send(
                self.room_group_name,
                request
            )
            logger.info("Chat request handled successfully")
        except Exception as e:
            logger.error(f"Error handling chat request: {str(e)}")

    async def handle_request_response(self, data):
        try:
            response = {
                'type': 'request_response',
                'response': data.get('response', ''),
                'sender': self.user.username
            }
            await self.channel_layer.group_send(
                self.room_group_name,
                response
            )
            logger.info("Request response handled successfully")
        except Exception as e:
            logger.error(f"Error handling request response: {str(e)}") 