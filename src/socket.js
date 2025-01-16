import http from "http";
import express from "express";
import { Server as SocketIO } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

io.on("connection", (socket) => {
  console.log("a user connected: ", socket.id);
});

server.listen(process.env.PORT2 || 8000, () => {
  console.log("socket running on: ", process.env.PORT2);
});
