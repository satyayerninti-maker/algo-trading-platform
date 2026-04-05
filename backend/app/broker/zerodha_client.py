import requests
import hashlib
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.core.config import settings


class ZerodhaClient:
    """Wrapper for Zerodha Kite Connect v3 API"""

    BASE_URL = "https://api.kite.trade"
    LOGIN_URL = "https://kite.zerodha.com/connect/login"

    def __init__(self, api_key: str, api_secret: str, access_token: str = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.session = requests.Session()

    def get_login_url(self, request_token: str) -> str:
        """
        Get login URL for OAuth2 flow.
        User should visit this URL to authenticate.
        """
        return f"{self.LOGIN_URL}?api_key={self.api_key}&request_token={request_token}"

    def get_auth_url(self, state: str = None) -> str:
        """Get the OAuth2 authorization URL."""
        url = f"{self.LOGIN_URL}?api_key={self.api_key}&v=3"
        if state:
            url += f"&state={state}"
        return url

    def generate_auth_token(self, request_token: str) -> Dict[str, Any]:
        """
        Exchange request token for access token.
        Called after user has authenticated at Zerodha website.
        """
        # Generate checksum
        checksum_str = f"{self.api_key}{request_token}{self.api_secret}"
        checksum = hashlib.sha256(checksum_str.encode()).hexdigest()

        url = f"{self.BASE_URL}/session/token"
        params = {
            "api_key": self.api_key,
            "request_token": request_token,
            "checksum": checksum,
        }

        headers = {
            "X-Kite-Version": "3",
        }

        print(f"[DEBUG] Exchanging token:")
        print(f"  URL: {url}")
        print(f"  API Key: {self.api_key[:10]}...")
        print(f"  Request Token: {request_token[:20]}...")
        print(f"  Checksum: {checksum[:20]}...")

        try:
            response = requests.post(url, data=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[DEBUG] Request failed: {str(e)}")
            print(f"[DEBUG] Response status: {e.response.status_code if hasattr(e, 'response') and e.response else 'N/A'}")
            print(f"[DEBUG] Response text: {e.response.text if hasattr(e, 'response') and e.response else 'N/A'}")
            raise Exception(f"Failed to generate auth token: {str(e)}")

    def set_access_token(self, access_token: str):
        """Set the access token for authenticated requests."""
        self.access_token = access_token

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for requests."""
        headers = {
            "X-Kite-Version": "3",
        }
        if self.access_token:
            headers["Authorization"] = f"token {self.api_key}:{self.access_token}"
        return headers

    def place_order(
        self,
        variety: str,
        exchange: str,
        tradingsymbol: str,
        transaction_type: str,
        quantity: int,
        price: float = 0,
        order_type: str = "MARKET",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Place an order on Zerodha.

        Args:
            variety: "regular" or "oco" or "iceberg"
            exchange: "NSE", "BSE", "NFO", "MCX"
            tradingsymbol: e.g., "RELIANCE" or "RELIANCE-EQ"
            transaction_type: "BUY" or "SELL"
            quantity: Lot size
            price: Price for limit orders (0 for market)
            order_type: "MARKET" or "LIMIT"
        """
        url = f"{self.BASE_URL}/orders/{variety}"

        params = {
            "exchange": exchange,
            "tradingsymbol": tradingsymbol,
            "transaction_type": transaction_type,
            "quantity": quantity,
            "order_type": order_type,
            "price": price,
        }

        # Add additional parameters
        params.update(kwargs)

        try:
            response = self.session.post(
                url, data=params, headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to place order: {str(e)}")

    def cancel_order(
        self, variety: str, order_id: str
    ) -> Dict[str, Any]:
        """Cancel an open order."""
        url = f"{self.BASE_URL}/orders/{variety}/{order_id}"

        try:
            response = self.session.delete(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to cancel order: {str(e)}")

    def get_positions(self) -> Dict[str, Any]:
        """Get all open positions."""
        url = f"{self.BASE_URL}/portfolio/positions"

        print(f"[DEBUG] get_positions() called")
        print(f"[DEBUG] URL: {url}")
        print(f"[DEBUG] API Key (first 10 chars): {self.api_key[:10] if self.api_key else 'NONE'}")
        print(f"[DEBUG] Access Token (first 20 chars): {self.access_token[:20] if self.access_token else 'NONE'}")

        try:
            response = self.session.get(url, headers=self._get_headers())
            print(f"[DEBUG] Response status: {response.status_code}")
            print(f"[DEBUG] Response text: {response.text}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[DEBUG] Request exception: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[DEBUG] Response status: {e.response.status_code}")
                print(f"[DEBUG] Response body: {e.response.text}")
            raise Exception(f"Failed to fetch positions: {str(e)}")

    def get_holdings(self) -> Dict[str, Any]:
        """Get all holdings (long-term positions)."""
        url = f"{self.BASE_URL}/portfolio/holdings"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch holdings: {str(e)}")

    def get_trades(self) -> Dict[str, Any]:
        """Get all trades for the day."""
        url = f"{self.BASE_URL}/trades"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch trades: {str(e)}")

    def get_orders(self) -> Dict[str, Any]:
        """Get all orders for the day."""
        url = f"{self.BASE_URL}/orders"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch orders: {str(e)}")

    def get_quote(self, symbols: List[str]) -> Dict[str, Any]:
        """Get live quotes for symbols."""
        url = f"{self.BASE_URL}/quote"
        params = {
            "i": symbols,
        }

        try:
            response = self.session.get(url, params=params, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch quote: {str(e)}")

    def get_user_profile(self) -> Dict[str, Any]:
        """Get user profile details."""
        url = f"{self.BASE_URL}/user/profile"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch user profile: {str(e)}")

    def get_account_balance(self) -> Dict[str, Any]:
        """Get account balance and margin details."""
        url = f"{self.BASE_URL}/user/margins"

        print(f"[DEBUG] get_account_balance() called")
        print(f"[DEBUG] URL: {url}")

        try:
            response = self.session.get(url, headers=self._get_headers())
            print(f"[DEBUG] Margins response status: {response.status_code}")
            print(f"[DEBUG] Margins response text: {response.text}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[DEBUG] Margins request exception: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[DEBUG] Margins response status: {e.response.status_code}")
                print(f"[DEBUG] Margins response body: {e.response.text}")
            raise Exception(f"Failed to fetch account balance: {str(e)}")
