# Running the Server

## The HTTP/HTTPS Error

The error you're seeing (`code 400, message Bad request version`) happens when:
- Your browser is trying to access via HTTPS (https://localhost)
- But the server is running HTTP (http://localhost)

**Solution**: Always use `http://` (not `https://`) when accessing the local server.

## How to Run the Server

### Option 1: Python (Recommended - Simple)

```bash
# Python 3
python -m http.server 8000 -d public

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000** (NOT https://)

### Option 2: Node.js http-server

```bash
# Install globally (one time)
npm install -g http-server

# Run server
http-server public -p 8000
```

Then open: **http://localhost:8000**

### Option 3: PHP

```bash
php -S localhost:8000 -t public
```

Then open: **http://localhost:8000**

### Option 4: VS Code Live Server

If you're using VS Code:
1. Install "Live Server" extension
2. Right-click on `public/index.html`
3. Select "Open with Live Server"

## Important Notes

- ✅ Always use **http://localhost:8000** (not https://)
- ✅ Make sure you're in the project root directory when running commands
- ✅ The server must serve from the `public/` folder
- ✅ After starting the server, open your browser and go to `http://localhost:8000`

## Troubleshooting

### "Port 8000 already in use"
Use a different port:
```bash
python -m http.server 8080 -d public
# Then access: http://localhost:8080
```

### "Cannot GET /"
Make sure you're serving from the `public/` folder, not the root folder.

### CORS errors
Make sure you're accessing via a web server (http://localhost), not by opening the HTML file directly (file://).






