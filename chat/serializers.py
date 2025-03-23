from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, ChatRequest, Message

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    mutual_likes = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'bio', 'created_at', 'mutual_likes']
        read_only_fields = ['created_at']

    def get_mutual_likes(self, obj):
        # Use a simplified serializer for mutual likes to prevent recursion
        return [{'id': profile.id, 'user': {'id': profile.user.id, 'username': profile.user.username}} 
                for profile in obj.mutual_likes.all()]

class ChatRequestSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    receiver = UserProfileSerializer(read_only=True)
    sender_id = serializers.IntegerField(write_only=True)
    receiver_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ChatRequest
        fields = ['id', 'sender', 'receiver', 'sender_id', 'receiver_id', 
                 'status', 'created_at', 'updated_at']
        read_only_fields = ['status', 'created_at', 'updated_at']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    receiver = UserProfileSerializer(read_only=True)
    receiver_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'receiver_id', 
                 'content', 'created_at', 'is_read']
        read_only_fields = ['created_at', 'is_read', 'sender'] 