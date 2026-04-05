from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.db import get_db
from app.database import crud
from app.broker.zerodha_client import ZerodhaClient
from app.core.config import settings
from app.core.security import verify_token
from cryptography.fernet import Fernet
from app.schemas import BrokerAccountResponse
import base64
from urllib.parse import urlencode

router = APIRouter(prefix="/api/broker", tags=["broker"])

# Initialize encryption for API secrets
def get_cipher():
    """Get cipher for encrypting/decrypting secrets."""
    # In production, use a proper key management service
    key = base64.urlsafe_b64encode(settings.ENCRYPTION_KEY.encode().ljust(32)[:32])
    return Fernet(key)


def encrypt_secret(secret: str) -> str:
    """Encrypt a secret."""
    cipher = get_cipher()
    return cipher.encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    """Decrypt a secret."""
    cipher = get_cipher()
    return cipher.decrypt(encrypted.encode()).decode()


@router.get("/zerodha/login-url")
def get_zerodha_login_url(token: str, db: Session = Depends(get_db)):
    """Get Zerodha login URL for OAuth2 flow."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        # Verify user exists
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Create Zerodha client
        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
        )

        # Return OAuth2 login URL with token as state parameter
        login_url = client.get_auth_url(state=token)
        return {"login_url": login_url, "status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}",
        )


@router.get("/zerodha/callback")
def zerodha_callback(request_token: str, db: Session = Depends(get_db)):
    """Handle Zerodha OAuth2 callback and redirect to frontend."""
    try:
        # Redirect back to frontend with request_token
        # Frontend will handle exchanging it for access_token with user's JWT token
        frontend_url = "http://localhost:3002/broker"
        params = {"request_token": request_token, "status": "authenticated"}
        redirect_url = f"{frontend_url}?{urlencode(params)}"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Callback error: {str(e)}",
        )


@router.post("/zerodha/exchange-token")
def exchange_zerodha_token(
    request_token: str, token: str, db: Session = Depends(get_db)
):
    """Exchange Zerodha request_token for access_token."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        # Create Zerodha client
        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
        )

        # Exchange request_token for access_token
        auth_response = client.generate_auth_token(request_token)

        print(f"[DEBUG] Auth response: {auth_response}")

        # Extract tokens from nested data structure
        response_data = auth_response.get("data", auth_response)
        access_token = response_data.get("access_token")
        user_id_from_response = response_data.get("user_id")

        print(f"[DEBUG] Access token: {access_token}")
        print(f"[DEBUG] User ID from response: {user_id_from_response}")

        if not access_token:
            print(f"[DEBUG] No access_token in response. Full response: {auth_response}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to generate access token",
            )

        # Store broker account with encrypted secret
        encrypted_secret = encrypt_secret(settings.ZERODHA_API_SECRET)

        # Check if account already exists
        existing_account = crud.get_broker_account(db, user_id, "zerodha")
        if existing_account:
            # Update existing account
            print(f"[DEBUG] Updating existing broker account: {existing_account.id}")
            crud.update_broker_token(
                db,
                existing_account.id,
                access_token,
                refresh_token=request_token,
                token_expires_at=datetime.utcnow() + timedelta(hours=24),
            )
            print(f"[DEBUG] Broker account updated and activated")
        else:
            # Create new broker account
            print(f"[DEBUG] Creating new broker account for user: {user_id}")
            crud.create_broker_account(
                db,
                user_id,
                "zerodha",
                settings.ZERODHA_API_KEY,
                encrypted_secret,
                access_token,
            )
            print(f"[DEBUG] Broker account created")

        return {
            "status": "success",
            "message": "Zerodha account linked successfully",
            "user_id": user_id_from_response,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to link Zerodha account: {str(e)}",
        )


@router.get("/zerodha/account", response_model=BrokerAccountResponse)
def get_zerodha_account(token: str, db: Session = Depends(get_db)):
    """Get linked Zerodha account details."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        account = crud.get_broker_account(db, user_id, "zerodha")
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zerodha account not linked",
            )

        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}",
        )


@router.delete("/zerodha/disconnect")
def disconnect_zerodha(token: str, db: Session = Depends(get_db)):
    """Disconnect Zerodha account."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        account = crud.get_broker_account(db, user_id, "zerodha")
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zerodha account not linked",
            )

        # Deactivate account
        account.is_active = False
        db.commit()

        return {"status": "success", "message": "Zerodha account disconnected"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}",
        )


@router.get("/zerodha/positions")
def get_zerodha_positions(token: str, db: Session = Depends(get_db)):
    """Get live positions from Zerodha."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        # Get broker account
        account = crud.get_broker_account(db, user_id, "zerodha")
        if not account or not account.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zerodha account not linked or inactive",
            )

        # Create Zerodha client with access token
        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
            access_token=account.access_token,
        )

        # Get positions from Zerodha
        positions_response = client.get_positions()
        print(f"[DEBUG] Raw Zerodha positions response: {positions_response}")

        # Return the response as-is - Zerodha will have it in the right format
        return positions_response

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error fetching positions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error fetching positions: {str(e)}",
        )


@router.get("/zerodha/margins")
def get_zerodha_margins(token: str, db: Session = Depends(get_db)):
    """Get account balance and margin details from Zerodha."""
    try:
        # Verify token and extract user_id
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user_id",
            )

        # Get broker account
        account = crud.get_broker_account(db, user_id, "zerodha")
        if not account or not account.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zerodha account not linked or inactive",
            )

        # Create Zerodha client with access token
        client = ZerodhaClient(
            api_key=settings.ZERODHA_API_KEY,
            api_secret=settings.ZERODHA_API_SECRET,
            access_token=account.access_token,
        )

        # Get account balance
        margins = client.get_account_balance()
        return margins

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error fetching margins: {str(e)}",
        )
