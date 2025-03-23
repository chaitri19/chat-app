from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from django.middleware.csrf import get_token
from .models import UserProfile, ChatRequest, Message
from .serializers import UserProfileSerializer, ChatRequestSerializer, MessageSerializer
from django.db import models

class CSRFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)})

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            login(request, user)
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        else:
            return Response(
                {'error': 'Invalid username or password - no user found'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            # Ensure the user has a profile
            user_profile, created = UserProfile.objects.get_or_create(user=self.request.user)
            return UserProfile.objects.exclude(user=self.request.user)
        except Exception as e:
            # Log the error for debugging
            print(f"Error in get_queryset: {str(e)}")
            return UserProfile.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            # Log the error for debugging
            print(f"Error in list: {str(e)}")
            return Response(
                {"error": "An error occurred while fetching profiles"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def send_request(self, request, pk=None):
        receiver_profile = self.get_object()
        if receiver_profile == request.user.userprofile:
            return Response(
                {"error": "Cannot send request to yourself"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if request already exists
        existing_request = ChatRequest.objects.filter(
            sender=request.user.userprofile,
            receiver=receiver_profile
        ).first()
        
        if existing_request:
            return Response(
                {"error": "Request already sent"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new request
        chat_request = ChatRequest.objects.create(
            sender=request.user.userprofile,
            receiver=receiver_profile,
            status='pending'
        )
        
        serializer = ChatRequestSerializer(chat_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def mutual_likes(self, request):
        user_profile = request.user.userprofile
        mutual_likes = user_profile.mutual_likes.all()
        serializer = self.get_serializer(mutual_likes, many=True)
        return Response(serializer.data)

class ChatRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_profile = self.request.user.userprofile
        return ChatRequest.objects.filter(
            models.Q(sender=user_profile) | models.Q(receiver=user_profile)
        )

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        chat_request = self.get_object()
        response = request.data.get('response')
        
        if response not in ['accepted', 'rejected']:
            return Response(
                {"error": "Invalid response. Must be 'accepted' or 'rejected'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if chat_request.receiver != request.user.userprofile:
            return Response(
                {"error": "You can only respond to requests sent to you"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chat_request.status = response
        chat_request.save()
        
        if response == 'accepted':
            # Add users to each other's mutual likes
            chat_request.sender.mutual_likes.add(chat_request.receiver)
            chat_request.receiver.mutual_likes.add(chat_request.sender)
        
        serializer = self.get_serializer(chat_request)
        return Response(serializer.data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            user_profile = self.request.user.userprofile
            return Message.objects.filter(
                models.Q(sender=user_profile) | models.Q(receiver=user_profile)
            ).order_by('created_at')
        except UserProfile.DoesNotExist:
            return Message.objects.none()

    def perform_create(self, serializer):
        try:
            receiver_id = self.request.data.get('receiver_id')
            if not receiver_id:
                raise serializers.ValidationError({"receiver_id": "This field is required."})
            
            content = self.request.data.get('content')
            if not content:
                raise serializers.ValidationError({"content": "This field is required."})

            receiver_profile = UserProfile.objects.get(user_id=receiver_id)
            
            # Check if users are in mutual likes
            if not (self.request.user.userprofile in receiver_profile.mutual_likes.all() and
                    receiver_profile in self.request.user.userprofile.mutual_likes.all()):
                raise serializers.ValidationError("You can only message users who have mutually liked each other")
            
            serializer.save(
                sender=self.request.user.userprofile,
                receiver=receiver_profile
            )
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError("Invalid receiver_id or user profile does not exist")
        except Exception as e:
            raise serializers.ValidationError(str(e))

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.receiver != request.user.userprofile:
            return Response(
                {"error": "You can only mark your received messages as read"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_read = True
        message.save()
        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Message.objects.filter(
            receiver=request.user.userprofile,
            is_read=False
        ).count()
        return Response({"count": count})
