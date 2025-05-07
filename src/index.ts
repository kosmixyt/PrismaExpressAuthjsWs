import express, { NextFunction, Request as ExpressRequest } from 'express'; // Modified import
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { router as userRoutes } from './routes/user';
import { ExpressAuth, getSession } from '@auth/express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authConfig, prisma } from './utils/config.auth';
import tls from 'tls'; // Added import

dotenv.config();

var app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    credentials: true,
    origin: "http://localhost:5173", // Configure this for your frontend's origin in production
    methods: ["GET", "POST"],
  },
});

io.on('connection', async (socket) => {
  // socket.request is http.IncomingMessage
  // Adapt it to look like an Express Request for getSession from @auth/express
  const { headers } = socket.request;
  const host = headers.host;

  // Determine protocol
  let protocol = 'http';
  // Check if connection is encrypted (HTTPS)
  // tls.TLSSocket has an 'encrypted' property. net.Socket does not.
  // Cast to any to check the property, or use instanceof tls.TLSSocket if preferred.
  if ((socket.request.connection as tls.TLSSocket).encrypted) {
    protocol = 'https';
  }
  // Check for X-Forwarded-Proto if behind a proxy
  const forwardedProtoHeader = headers['x-forwarded-proto'];
  if (typeof forwardedProtoHeader === 'string') {
    // Take the first value if multiple are present (e.g., "https, http")
    protocol = forwardedProtoHeader.split(',')[0].trim();
  }

  const mockExpressRequest = {
    headers: headers, // Provides req.headers.cookie for getSession
    protocol: protocol, // Provides req.protocol for getSession
    get: (name: string): string | undefined => { // Provides req.get(name) for getSession
      if (name.toLowerCase() === 'host') {
        return host;
      }
      // Express's req.get() also normalizes other header names to lowercase.
      // This simplified version covers 'host' and direct lowercase access.
      return headers[name.toLowerCase()] as string | undefined;
    },
    // Add other Express.Request properties if getSession implementation were to need them.
    // Based on @auth/express source, `req.protocol`, `req.get("host")`,
    // and `req.headers.cookie` are the primary needs.
  } as ExpressRequest; // Type assertion to satisfy getSession's parameter type

  const session = await getSession(mockExpressRequest, authConfig);
  console.log('A user connected via Socket.IO:', socket.id, session);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/users', userRoutes);
app.use("/auth/*",  ExpressAuth(authConfig))
app.get('/', (req, res) => res.send('Express + TypeScript + Prisma + Auth.js Server is running!'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
