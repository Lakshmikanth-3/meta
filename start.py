import subprocess
import sys
import os
import time
import socket

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


def wait_for_port(port, timeout_seconds=20.0):
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if is_port_in_use(port):
            return True
    return False

def main():
    print("\n" + "="*50)
    print(" Starting DeadlineEnv")
    print("="*50)
    
    # Quick port checks
    if is_port_in_use(7860):
        print("⚠️ Warning: Port 7860 is already in use. Backend might fail to start or is already running.")
    if is_port_in_use(3000):
        print("⚠️ Warning: Port 3000 is already in use. Frontend might fail to start or is already running.")

    # Shared Environment setup
    env = os.environ.copy()

    # Load .env file manually into environment
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    env[k] = v

    env["PYTHONPATH"] = "."
    env["NEXT_PUBLIC_BACKEND_URL"] = "http://localhost:7860"
    env["BACKEND_URL"] = "http://localhost:7860"

    # Start Backend
    print("\n[+] Starting Python Backend (FastAPI)...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"],
        cwd="backend",
        env=env
    )

    if wait_for_port(7860, timeout_seconds=20.0):
        print("[+] Backend is accepting connections on port 7860")
    else:
        print("[-] Backend did not become ready within 20 seconds. Check backend logs.")
    
    # Start Frontend
    print("\n[+] Starting Next.js Frontend...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd="frontend",
        env=env
    )

    print("\n" + "="*50)
    print(" All services launching in background logs!")
    print(" Frontend: http://localhost:3000")
    print(" Backend:  http://localhost:7860/docs")
    print(" Press Ctrl+C at any time to kill both servers.")
    print("="*50 + "\n")

    try:
        # Keep main thread alive waiting for subprocesses
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n\n[!] Caught Ctrl+C. Shutting down services safely...")
        
        # Terminate cleanly
        if backend_proc.poll() is None:
            backend_proc.terminate()
        if frontend_proc.poll() is None:
            frontend_proc.terminate()
            
        backend_proc.wait()
        frontend_proc.wait()
        print("[-] Shutdown complete. Goodbye!")

if __name__ == "__main__":
    main()
