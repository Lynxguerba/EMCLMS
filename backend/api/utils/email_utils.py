import requests
from django.conf import settings

def send_registration_confirmation_email(user_email, user_first_name, password):
    """
    Sends a registration confirmation email using Brevo (formerly Sendinblue).
    """
    
    api_key = getattr(settings, "BREVO_API_KEY", None)
    sender_email = getattr(settings, "BREVO_SENDER_EMAIL", None)

    if not api_key:
        print("CRITICAL: BREVO_API_KEY is not set in environment variables.")
        return False
    
    if not sender_email:
        print("CRITICAL: BREVO_SENDER_EMAIL is not set in environment variables.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2e7d32;">Welcome to EMC LMS!</h2>
                <p>Dear <strong>{user_first_name}</strong>,</p>
                <p>We are pleased to inform you that your registration request has been <strong>approved</strong>.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Your Login Credentials:</strong></p>
                    <p style="margin: 5px 0;">Email: {user_email}</p>
                    <p style="margin: 5px 0;">Password: <code style="background: #e0e0e0; padding: 2px 5px; border-radius: 3px;">{password}</code></p>
                </div>
                <p>Please change your password immediately after your first login for security purposes.</p>
                <br>
                <p>Best regards,<br><strong>EMC LMS Team</strong></p>
            </div>
        </body>
    </html>
    """
    
    payload = {
        "sender": {
            "name": "EMC LMS",
            "email": sender_email
        },
        "to": [
            {
                "email": user_email,
                "name": user_first_name
            }
        ],
        "subject": "Registration Approved - EMC LMS",
        "htmlContent": html_content
    }
    
    try:
        # Added timeout=10 to prevent hanging
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code in [200, 201, 202]:
            print(f"SUCCESS: Email sent to {user_email}")
            return True
        else:
            print(f"ERROR: Brevo API returned {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Connection Error. Please check your internet connection or DNS settings.")
        return False
    except requests.exceptions.Timeout:
        print("ERROR: The request timed out.")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {str(e)}")
        return False