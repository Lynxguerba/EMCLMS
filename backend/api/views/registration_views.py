from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import User, RegistrationRequest
from ..throttles import RegisterRateThrottle
from ..utils import is_admin_or_superadmin

@api_view(['POST'])
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    try:
        data = request.data
        email = data.get('email')
        first_name = data.get('first_name')
        last_name = data.get('last_name')

        if not email or not first_name or not last_name:
             return Response({'detail': 'All fields (email, first_name, last_name) are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing user
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing pending request
        if RegistrationRequest.objects.filter(email__iexact=email, status=RegistrationRequest.Status.PENDING).exists():
             return Response({'detail': 'A registration request for this email is already pending.'}, status=status.HTTP_400_BAD_REQUEST)

        RegistrationRequest.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            status=RegistrationRequest.Status.PENDING
        )

        return Response({'message': 'Registration request submitted successfully.'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_registration_requests(request):
    # Ensure admin
    user_id = request.session.get('user_id')
    if not user_id:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        user = User.objects.get(user_id=user_id)
        if not is_admin_or_superadmin(user):
             return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    except User.DoesNotExist:
         return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    requests = RegistrationRequest.objects.all().order_by('-requested_at')
    data = []
    for req in requests:
        data.append({
            'id': req.id,
            'email': req.email,
            'first_name': req.first_name,
            'last_name': req.last_name,
            'status': req.status.lower(), # Frontend expects lowercase 'pending', 'approved' etc based on dummy data
            'requested_at': req.requested_at,
            'created_at': req.requested_at # Frontend uses both
        })
    
    return Response(data, status=status.HTTP_200_OK)

@api_view(['DELETE'])
def delete_registration_request(request, pk):
    # Ensure admin
    user_id = request.session.get('user_id')
    if not user_id:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        user = User.objects.get(user_id=user_id)
        if not is_admin_or_superadmin(user):
             return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    except User.DoesNotExist:
         return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    req = get_object_or_404(RegistrationRequest, pk=pk)
    req.delete()
    return Response({'message': 'Request deleted.'}, status=status.HTTP_204_NO_CONTENT)
