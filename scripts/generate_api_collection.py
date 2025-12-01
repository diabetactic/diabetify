import json
import os

# Diabetactic Service Configuration
SERVICES = {
    "API Gateway": {
        "port": 8004,
        "description": "Main Public API for Mobile App",
        "folders": {
            "Auth": [
                {"name": "Get Token", "method": "POST", "path": "/token", "body": {"username": "12345678A", "password": "password"}}
            ],
            "Glucose": [
                {"name": "My Readings", "method": "GET", "path": "/glucose/mine"},
                {"name": "My Latest Reading", "method": "GET", "path": "/glucose/mine/latest"},
                {"name": "Create Reading", "method": "POST", "path": "/glucose/create", "body": {"value": 120, "date": "2025-11-30T10:00:00"}}
            ],
            "Appointments": [
                {"name": "My Appointments", "method": "GET", "path": "/appointments/mine"},
                {"name": "My Queue State", "method": "GET", "path": "/appointments/state"},
                {"name": "My Queue Placement", "method": "GET", "path": "/appointments/placement"},
                {"name": "Create Appointment", "method": "POST", "path": "/appointments/create", "body": {"date": "2025-12-01T09:00:00", "reason": "Checkup"}},
                {"name": "Submit to Queue", "method": "POST", "path": "/appointments/submit", "body": {}},
                {"name": "Get Resolution", "method": "GET", "path": "/appointments/{id}/resolution"}
            ],
            "Users": [
                 # Inferred from router include
            ]
        }
    },
    "API Gateway Backoffice": {
        "port": 8006,
        "description": "API for Admin Panel",
        "folders": {
            "Auth": [
                {"name": "Get Token", "method": "POST", "path": "/token", "body": {"username": "admin", "password": "password"}},
                {"name": "Recover Password", "method": "POST", "path": "/recover", "body": {"email": "admin@example.com"}}
            ],
            "Admin": [
                {"name": "Create Admin", "method": "POST", "path": "/admin/", "body": {"username": "newadmin", "password": "password"}},
                {"name": "Grant Access", "method": "POST", "path": "/admin/grantaccess", "body": {"username": "admin", "password": "password"}},
                 {"name": "Check Password", "method": "POST", "path": "/admin/password/check", "body": {"password": "password"}}
            ],
             "Users": [
                {"name": "List Users", "method": "GET", "path": "/users/"},
                {"name": "Get User by ID", "method": "GET", "path": "/users/{id}"},
                {"name": "Block User", "method": "POST", "path": "/users/block/{id}", "body": {}}
            ],
            "Appointments": [
                 {"name": "Pending Queue", "method": "GET", "path": "/appointments/pending"},
                 {"name": "Accepted Queue", "method": "GET", "path": "/appointments/accepted"},
                 {"name": "Queue Size", "method": "GET", "path": "/appointments/queue/size"},
                 {"name": "Accept Request", "method": "PUT", "path": "/appointments/accept/{placement}"},
                 {"name": "Deny Request", "method": "PUT", "path": "/appointments/deny/{placement}"}
            ],
             "Glucose": [
                 {"name": "User Readings", "method": "GET", "path": "/glucose/user/{id}"}
             ]
        }
    },
    "Internal - Glucose Service": {
        "port": 8002,
        "folders": {
            "Readings": [
                {"name": "Get All", "method": "GET", "path": "/readings/"},
                {"name": "Get User Readings", "method": "GET", "path": "/readings/user", "query": [{"key": "user_id", "value": "1"}]},
                 {"name": "Create Reading", "method": "POST", "path": "/readings/", "body": {"user_id": 1, "glucose": 110, "measured_at": "2025-11-30T12:00:00"}}
            ]
        }
    },
    "Internal - Login Service": {
        "port": 8003,
        "folders": {
            "Users": [
                {"name": "Grant Access", "method": "POST", "path": "/users/grantaccess", "body": {"dni": "12345678A", "password": "pass"}}
            ],
            "Admin": [
                 {"name": "Grant Access", "method": "POST", "path": "/admin/grantaccess", "body": {"username": "admin", "password": "pass"}}
            ]
        }
    },
    "Internal - Appointments Service": {
        "port": 8005,
        "folders": {
            "Appointments": [
                {"name": "Get All", "method": "GET", "path": "/appointments"},
                {"name": "Create", "method": "POST", "path": "/appointments/create", "body": {"user_id": 1, "date": "..."}}
            ],
            "Queue": [
                {"name": "Get Queue", "method": "GET", "path": "/queue"}
            ]
        }
    }
}

# Tidepool API Configuration (Curated from App Usage)
TIDEPOOL_API = {
    "info": {
        "name": "Tidepool API (Curated)",
        "description": "Endpoints used by Diabetactic app + common Tidepool operations.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Auth",
            "item": [
                {
                    "name": "Login (Legacy)",
                    "request": {
                        "method": "POST",
                        "url": "https://api.tidepool.org/auth/login",
                        "header": [{"key": "Authorization", "value": "{{basic_auth_header}}"}],
                        "description": "Legacy Basic Auth login. Returns x-tidepool-session-token header."
                    }
                },
                {
                    "name": "Refresh Token (OAuth)",
                    "request": {
                        "method": "POST",
                        "url": "https://api.tidepool.org/auth/oauth/token",
                        "body": {
                            "mode": "urlencoded",
                            "urlencoded": [
                                {"key": "grant_type", "value": "refresh_token"},
                                {"key": "refresh_token", "value": "{{refresh_token}}"},
                                {"key": "client_id", "value": "{{client_id}}"}
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "User Data",
            "item": [
                {
                    "name": "Get Profile",
                    "request": {
                        "method": "GET",
                        "url": "https://api.tidepool.org/metadata/{{userId}}/profile",
                        "header": [{"key": "X-Tidepool-Session-Token", "value": "{{session_token}}"}]
                    }
                },
                {
                    "name": "Get Data Sources",
                    "request": {
                        "method": "GET",
                        "url": "https://api.tidepool.org/v1/users/{{userId}}/data_sources",
                        "header": [{"key": "X-Tidepool-Session-Token", "value": "{{session_token}}"}]
                    }
                }
            ]
        },
        {
            "name": "Clinical Data",
            "item": [
                {
                    "name": "Get All Data",
                    "request": {
                        "method": "GET",
                        "url": {
                            "raw": "https://api.tidepool.org/data/{{userId}}?startDate=2024-01-01&endDate=2025-12-31",
                            "host": ["api", "tidepool", "org"],
                            "path": ["data", "{{userId}}"],
                            "query": [
                                {"key": "startDate", "value": "2024-01-01"},
                                {"key": "endDate", "value": "2025-12-31"},
                                {"key": "type", "value": "cbg,smbg,bolus,wizard", "description": "Optional type filter"}
                            ]
                        },
                        "header": [{"key": "X-Tidepool-Session-Token", "value": "{{session_token}}"}]
                    }
                }
            ]
        }
    ],
    "variable": [
        {"key": "userId", "value": "YOUR_USER_ID", "type": "string"},
        {"key": "session_token", "value": "YOUR_SESSION_TOKEN", "type": "string"},
        {"key": "client_id", "value": "YOUR_CLIENT_ID", "type": "string"}
    ]
}

def create_item(name, method, path, local_port, body=None, query=None):
    service_port_var = f"{{{{port_{local_port}}}}}"
    
    item = {
        "name": name,
        "request": {
            "method": method,
            "header": [
                {"key": "Content-Type", "value": "application/json"}
            ],
            "url": {
                "raw": f"{{{{protocol}}}}://{{{{host}}}}:{{{{port_{local_port}}}}}{path}",
                "protocol": "{{protocol}}",
                "host": ["{{host}}"],
                "port": f"{{{{port_{local_port}}}}}",
                "path": path.strip("/").split("/")
            }
        },
        "response": []
    }
    
    if body:
        item["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=2)
        }
        
    if query:
        item["request"]["url"]["query"] = query
        
    return item

collection = {
    "info": {
        "name": "Diabetactic API Collection",
        "description": "Auto-generated collection. Import 'diabetactic.postman_environment.json' for Local/Prod switching.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [],
    "variable": [
        {"key": "protocol", "value": "http", "type": "string"},
        {"key": "host", "value": "localhost", "type": "string"},
        {"key": "port_8004", "value": "8004", "type": "string"}, 
        {"key": "port_8006", "value": "8006", "type": "string"}, 
        {"key": "port_8002", "value": "8002", "type": "string"}, 
        {"key": "port_8003", "value": "8003", "type": "string"}, 
        {"key": "port_8005", "value": "8005", "type": "string"}, 
    ]
}

for service_name, config in SERVICES.items():
    service_folder = {
        "name": service_name,
        "item": [],
        "description": config.get("description", "")
    }
    
    for folder_name, routes in config.get("folders", {}).items():
        sub_folder = {
            "name": folder_name,
            "item": []
        }
        for route in routes:
            item = create_item(
                route["name"], 
                route["method"], 
                route["path"], 
                config["port"], 
                route.get("body"),
                route.get("query")
            )
            sub_folder["item"].append(item)
        service_folder["item"].append(sub_folder)
        
    collection["item"].append(service_folder)

# Save Diabetactic Collection
with open("diabetactic.postman_collection.json", "w") as f:
    json.dump(collection, f, indent=2)

# Save Tidepool Collection
with open("tidepool.postman_collection.json", "w") as f:
    json.dump(TIDEPOOL_API, f, indent=2)

# Generate Environment Files
local_env = {
    "id": "env_local",
    "name": "Diabetactic - Local (Microservices)",
    "values": [
        {"key": "protocol", "value": "http", "enabled": True},
        {"key": "host", "value": "localhost", "enabled": True},
        {"key": "port_8004", "value": "8004", "enabled": True},
        {"key": "port_8006", "value": "8006", "enabled": True},
        {"key": "port_8002", "value": "8002", "enabled": True},
        {"key": "port_8003", "value": "8003", "enabled": True},
        {"key": "port_8005", "value": "8005", "enabled": True}
    ],
    "_postman_variable_scope": "environment"
}

prod_env = {
    "id": "env_prod",
    "name": "Diabetactic - Production (Gateway)",
    "values": [
        {"key": "protocol", "value": "https", "enabled": True},
        {"key": "host", "value": "api.diabetactic.com", "enabled": True},
        {"key": "port_8004", "value": "443", "enabled": True},
        {"key": "port_8006", "value": "443", "enabled": True},
        {"key": "port_8002", "value": "443", "enabled": True},
        {"key": "port_8003", "value": "443", "enabled": True},
        {"key": "port_8005", "value": "443", "enabled": True}
    ],
    "_postman_variable_scope": "environment"
}

with open("diabetactic.local.postman_environment.json", "w") as f:
    json.dump(local_env, f, indent=2)
    
with open("diabetactic.prod.postman_environment.json", "w") as f:
    json.dump(prod_env, f, indent=2)

print("Generated: Diabetactic Collection, Tidepool Collection, and Environments")