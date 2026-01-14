#!/usr/bin/env python3
"""
User management utility for Diabetactic local testing environment.
Provides functions to create, delete, and manage test users.
"""

import os
import sys
import requests
import json
from typing import Optional, Dict, Any

# Configuration from environment variables
LOGIN_SERVICE_URL = os.getenv('LOGIN_SERVICE_URL', 'http://login_service:8000')
API_GATEWAY_URL = os.getenv('API_GATEWAY_URL', 'http://api-gateway:8000')


def create_user(
    dni: str,
    password: str,
    name: str = "Test",
    surname: str = "User",
    email: Optional[str] = None,
    hospital_account: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new test user.

    Args:
        dni: User DNI (ID number)
        password: User password
        name: User first name (default: "Test")
        surname: User last name (default: "User")
        email: User email (default: generated from DNI)
        hospital_account: Hospital account status (default: "pending")

    Returns:
        Dict with user data or error information
    """
    if email is None:
        email = f"test_{dni}@diabetactic.test"
    
    if hospital_account is None:
        hospital_account = f"account_{dni}"

    user_data = {
        "dni": dni,
        "password": password,
        "name": name,
        "surname": surname,
        "email": email,
        "hospital_account": hospital_account,
        "blocked": False,
        "tidepool": None,
        "times_measured": 0,
        "streak": 0,
        "max_streak": 0
    }

    try:
        response = requests.post(
            f"{LOGIN_SERVICE_URL}/users/",
            json=user_data,
            timeout=10
        )

        if response.status_code in [200, 201]:
            print(f"✓ User created successfully:")
            print(f"  DNI: {dni}")
            print(f"  Password: {password}")
            print(f"  Email: {email}")
            print(f"  Name: {name} {surname}")
            return response.json()
        else:
            print(f"✗ Failed to create user: {response.status_code}")
            print(f"  Response: {response.text}")
            return {"error": response.text, "status_code": response.status_code}

    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to login service: {e}")
        return {"error": str(e)}


def delete_user(dni: str) -> bool:
    """
    Delete a user by DNI.
    Note: This requires getting the user_id first, then using admin routes.

    Args:
        dni: User DNI (ID number)

    Returns:
        True if successful, False otherwise
    """
    try:
        # First, get user info to find user_id
        response = requests.get(
            f"{LOGIN_SERVICE_URL}/users/from_dni/{dni}",
            timeout=10
        )

        if response.status_code != 200:
            print(f"✗ User not found: {dni}")
            return False

        user_data = response.json()
        user_id = user_data.get('user_id')

        if not user_id:
            print(f"✗ Could not retrieve user_id for DNI: {dni}")
            return False

        # Block the user (as there's no direct delete endpoint)
        block_response = requests.post(
            f"{LOGIN_SERVICE_URL}/users/block/{user_id}",
            timeout=10
        )

        if block_response.status_code == 200:
            print(f"✓ User blocked successfully:")
            print(f"  DNI: {dni}")
            print(f"  User ID: {user_id}")
            return True
        else:
            print(f"✗ Failed to block user: {block_response.status_code}")
            print(f"  Response: {block_response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to login service: {e}")
        return False


def get_user(dni: str) -> Optional[Dict[str, Any]]:
    """
    Get user information by DNI.

    Args:
        dni: User DNI (ID number)

    Returns:
        Dict with user data or None if not found
    """
    try:
        response = requests.get(
            f"{LOGIN_SERVICE_URL}/users/from_dni/{dni}",
            timeout=10
        )

        if response.status_code == 200:
            user_data = response.json()
            print(f"✓ User found:")
            print(f"  User ID: {user_data.get('user_id')}")
            print(f"  DNI: {user_data.get('dni')}")
            print(f"  Name: {user_data.get('name')} {user_data.get('surname')}")
            print(f"  Email: {user_data.get('email')}")
            print(f"  Blocked: {user_data.get('blocked')}")
            print(f"  Hospital Account: {user_data.get('hospital_account')}")
            return user_data
        else:
            print(f"✗ User not found: {dni}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to login service: {e}")
        return None


def list_users() -> list:
    """
    List all users in the system.

    Returns:
        List of user dictionaries
    """
    try:
        response = requests.get(
            f"{LOGIN_SERVICE_URL}/users/",
            timeout=10
        )

        if response.status_code == 200:
            users = response.json()
            print(f"✓ Found {len(users)} users:")
            for user in users:
                print(f"  - {user.get('dni')}: {user.get('name')} {user.get('surname')} ({user.get('email')})")
            return users
        else:
            print(f"✗ Failed to list users: {response.status_code}")
            return []

    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to login service: {e}")
        return []


def update_hospital_account(dni: str, status: str) -> bool:
    """
    Update user's hospital account status.

    Args:
        dni: User DNI (ID number)
        status: New status ('pending', 'accepted', 'rejected', etc.)

    Returns:
        True if successful, False otherwise
    """
    try:
        # First, get user info to find user_id
        response = requests.get(
            f"{LOGIN_SERVICE_URL}/users/from_dni/{dni}",
            timeout=10
        )

        if response.status_code != 200:
            print(f"✗ User not found: {dni}")
            return False

        user_data = response.json()
        user_id = user_data.get('user_id')

        if not user_id:
            print(f"✗ Could not retrieve user_id for DNI: {dni}")
            return False

        # Update hospital account status
        update_response = requests.patch(
            f"{LOGIN_SERVICE_URL}/users/{user_id}",
            json={"hospital_account": status},
            timeout=10
        )

        if update_response.status_code == 200:
            print(f"✓ Hospital account status updated successfully:")
            print(f"  DNI: {dni}")
            print(f"  New Status: {status}")
            return True
        else:
            print(f"✗ Failed to update hospital account: {update_response.status_code}")
            print(f"  Response: {update_response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ Error connecting to login service: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Create user:  python3 user_manager.py create <dni> <password> [name] [surname] [email]")
        print("  Delete user:  python3 user_manager.py delete <dni>")
        print("  Get user:     python3 user_manager.py get <dni>")
        print("  List users:   python3 user_manager.py list")
        print("  Update status: python3 user_manager.py update-status <dni> <status>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "create":
        if len(sys.argv) < 4:
            print("Error: create requires DNI and password")
            sys.exit(1)

        dni = sys.argv[2]
        password = sys.argv[3]
        name = sys.argv[4] if len(sys.argv) > 4 else "Test"
        surname = sys.argv[5] if len(sys.argv) > 5 else "User"
        email = sys.argv[6] if len(sys.argv) > 6 else None

        create_user(dni, password, name, surname, email)

    elif command == "delete":
        if len(sys.argv) < 3:
            print("Error: delete requires DNI")
            sys.exit(1)

        dni = sys.argv[2]
        delete_user(dni)

    elif command == "get":
        if len(sys.argv) < 3:
            print("Error: get requires DNI")
            sys.exit(1)

        dni = sys.argv[2]
        get_user(dni)

    elif command == "list":
        list_users()

    elif command == "update-status":
        if len(sys.argv) < 4:
            print("Error: update-status requires DNI and status")
            sys.exit(1)

        dni = sys.argv[2]
        status = sys.argv[3]
        update_hospital_account(dni, status)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
