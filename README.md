# Kinetix — Video Streaming Backend

Kinetix is the backend for a video streaming application built with **Node.js, Express.js, MongoDB, and Cloudinary**.

The project provides the server-side foundation for user authentication, video management, media storage, and API communication for a video streaming platform.

## 🛠️ Installation

Clone the repository:

```bash
git clone https://github.com/devsubhamdas/kinetix-backend.git
cd kinetix-backend
```

Install dependencies:

```bash
npm install
```

## 🚀 Tech Stack

- **Node.js** — JavaScript runtime
- **Express.js** — Backend web framework
- **MongoDB** — Database
- **Mongoose** — MongoDB ODM
- **JWT** — Authentication using access and refresh tokens
- **bcrypt** — Password hashing
- **Cloudinary** — Media storage and management
- **Multer** — File upload handling
- **CORS** — Cross-origin resource sharing
- **Socket.IO** — Real-time communication _(under development)_
- **dotenv** — Environment configuration
- **Nodemon** — Development server

## ✨ Features

- User authentication and authorization
- Password hashing with bcrypt
- Access token and refresh token based authentication
- Cookie-based authentication support
- Video and media upload handling
- Cloudinary integration for media storage
- MongoDB database integration
- Pagination support with Mongoose Aggregate Paginate
- Configurable CORS origins
- LAN-based frontend access for testing across devices
- Socket.IO integration _(currently under development)_

## 📁 Project Structure

```text
src/
├── controllers/      # Request handlers
├── db/               # Database configuration
├── middlewares/      # Application middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── utils/            # Utility functions
├── app.js            # Express application
└── index.js          # Application entry point
```

> The exact structure may evolve as the project continues to develop.

## ⚙️ Environment Variables

Create a `.env` file based on the provided environment template:

```env
# HTTP server port
PORT=3000

# WebSocket port
PORT2=8000

# MongoDB
MONGODB_URI=

# Frontend origins
CORS_ORIGIN_1=http://localhost:5173
CORS_ORIGIN_2=http://YOUR_LOCAL_IP:5173

# Environment
NODE_ENV=development

# JWT
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIARY=

REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIARY=

# Cloudinary
COLUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### CORS Configuration

`CORS_ORIGIN_1` is typically used for the local frontend running on the same machine.

`CORS_ORIGIN_2` can be configured with the machine's **local network IP address** to allow the frontend to connect from other devices on the same network.

For example:

```env
CORS_ORIGIN_2=http://192.168.1.100:5173
```

The IP address should be changed according to the current local network.

> This setup is intended primarily for local/LAN development and testing. Production deployments should use the appropriate deployed frontend origin.

Create a `.env` file and configure the required environment variables.

## ▶️ Running the Project

### Development

```bash
npm run dev
```

This starts the application using Nodemon, allowing the server to automatically restart when source files change.

### Production

```bash
npm start
```

## 🔌 Server Configuration

The application has separate configuration for the HTTP server and the planned WebSocket functionality.

| Variable | Purpose          | Default |
| -------- | ---------------- | ------: |
| `PORT`   | HTTP/API server  |  `3000` |
| `PORT2`  | WebSocket server |  `8000` |

The WebSocket functionality using Socket.IO is **currently under development**.

## 🔐 Authentication

Kinetix uses **JWT-based authentication** with separate access and refresh tokens.

- Access tokens authenticate API requests.
- Refresh tokens are used to obtain new access tokens.
- Passwords are hashed using **bcrypt**.
- Authentication can be maintained using HTTP cookies.

JWT secrets and token expiration values are configured through environment variables.

## ☁️ Media Storage

Kinetix uses **Multer** for handling uploaded files and **Cloudinary** for media storage.

This allows uploaded video and image assets to be stored externally rather than directly on the application server.

## 🗄️ Database

The application uses **MongoDB** with **Mongoose**.

Mongoose provides schema modeling and database interaction, while `mongoose-aggregate-paginate-v2` is used for pagination of aggregation queries.

## 🌐 LAN Development

The backend can be configured for development across multiple devices on the same local network.

For example, if the development machine has the local IP address:

```text
192.168.1.100
```

the frontend can be accessed from another device using:

```text
http://192.168.1.100:5173
```

and the corresponding origin can be added to:

```env
CORS_ORIGIN_2=http://192.168.1.100:5173
```

This is useful for testing the application on devices such as phones, tablets, or other computers connected to the same network.

## 📜 Available Scripts

| Command       | Description                               |
| ------------- | ----------------------------------------- |
| `npm run dev` | Start the development server with Nodemon |
| `npm start`   | Start the application with Node.js        |
| `npm test`    | Placeholder test script                   |

## 🔒 Security Notes

- Keep all secrets in environment variables.
- Never commit `.env` or files containing credentials.
- Use strong, unique JWT secrets in production.
- Restrict CORS origins to trusted frontend applications.
- Do not use development LAN addresses in production configuration.
- Use separate production credentials for MongoDB and Cloudinary.

## 🚧 Project Status

Kinetix is an ongoing video streaming application project.

### Currently implemented

- Authentication
- JWT access/refresh token system
- MongoDB integration
- Video/media upload handling
- Cloudinary integration
- CORS configuration
- LAN-based development support

### Under development

- Real-time functionality using Socket.IO

## 🔗 Associated Repository

The frontend is part of the Kinetix video streaming platform and works alongside its associated backend repository.

**Frontend:** [Kinetix Frontend](https://github.com/devsubhamdas/kinetix-frontend)

## 📄 License

This project is currently released under the **MIT License**.
