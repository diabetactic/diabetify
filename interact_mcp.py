
import subprocess
import json
import sys
import os
import time
import threading
import select
import base64

def read_output(pipe, pipe_name):
    """Reads from a pipe and prints, to avoid blocking."""
    try:
        for line in iter(pipe.readline, b''):
            print(f"[{pipe_name}] {line.decode('utf-8').strip()}", file=sys.stderr)
    except Exception as e:
        print(f"Error reading from {pipe_name}: {e}", file=sys.stderr)

def send_message(proc, message):
    """Sends a JSON-RPC message to the subprocess."""
    message_str = json.dumps(message)
    proc.stdin.write((message_str + '\\n').encode('utf-8'))
    proc.stdin.flush()
    print(f"Sent: {message_str}", file=sys.stderr)

def read_message(proc, timeout=30):
    """Reads a JSON-RPC message from the subprocess with a timeout."""
    print(f"Waiting for message with timeout={timeout}s", file=sys.stderr)
    rlist, _, _ = select.select([proc.stdout], [], [], timeout)
    if not rlist:
        raise TimeoutError("Timed out waiting for a response from the server.")
    line = proc.stdout.readline().decode('utf-8')
    if not line:
        return None
    print(f"Received: {line.strip()}", file=sys.stderr)
    return json.loads(line)

def main():
    """Starts the server, sends a request, and prints the response."""
    server_process = None
    try:
        command = ["node", "mobile-mcp/lib/index.js", "--stdio"]
        server_process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.getcwd()
        )

        stderr_thread = threading.Thread(target=read_output, args=(server_process.stderr, "stderr"))
        stderr_thread.daemon = True
        stderr_thread.start()

        while True:
            try:
                initial_message = read_message(server_process, timeout=5)
                if initial_message and initial_message.get("method") == "server_info":
                    print("Received server_info, proceeding with initialization.", file=sys.stderr)
                    break
                else:
                    print("Waiting for server_info...", file=sys.stderr)
            except TimeoutError:
                print("No message from server, assuming it's ready for initialization.", file=sys.stderr)
                break


        init_request = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "clientInfo": { "name": "python-script" }
            },
            "id": 0
        }
        send_message(server_process, init_request)
        init_response = read_message(server_process)
        print("Initialize response:", json.dumps(init_response, indent=2))
        if 'error' in init_response:
            raise RuntimeError("Server initialization failed")

        list_devices_request = {
            "jsonrpc": "2.0",
            "method": "tool/call",
            "params": {
                "name": "mobile_list_available_devices",
                "input": {}
            },
            "id": 1
        }
        send_message(server_process, list_devices_request)
        list_devices_response = read_message(server_process)
        print("List devices response:", json.dumps(list_devices_response, indent=2))

        if 'result' in list_devices_response and 'content' in list_devices_response['result']:
            devices_text = list_devices_response['result']['content'][0]['text']
            devices_data = json.loads(devices_text)
            if devices_data['devices']:
                device_id = devices_data['devices'][0]['id']
                print(f"Found device: {device_id}", file=sys.stderr)

                screenshot_request = {
                    "jsonrpc": "2.0",
                    "method": "tool/call",
                    "params": {
                        "name": "mobile_take_screenshot",
                        "input": { "device": device_id }
                    },
                    "id": 2
                }
                send_message(server_process, screenshot_request)
                screenshot_response = read_message(server_process)
                print("Screenshot response:", json.dumps(screenshot_response, indent=2))

                if 'result' in screenshot_response and 'content' in screenshot_response['result']:
                    image_data = screenshot_response['result']['content'][0]['data']
                    with open("screenshot.png", "wb") as f:
                        f.write(base64.b64decode(image_data))
                    print("Screenshot saved to screenshot.png", file=sys.stderr)
            else:
                print("No devices found.", file=sys.stderr)

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)

    finally:
        if server_process:
            if server_process.poll() is None:
                print("Terminating server process.", file=sys.stderr)
                server_process.terminate()
                server_process.wait(timeout=5)
            stderr_thread.join(timeout=2)


if __name__ == "__main__":
    main()
