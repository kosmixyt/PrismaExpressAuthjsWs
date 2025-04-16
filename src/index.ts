import express, { NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { router as userRoutes } from './routes/user';
import { ExpressAuth, getSession } from '@auth/express';
import { PrismaAdapter } from '@auth/prisma-adapter';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import cookie from 'cookie';
import signature from 'cookie-signature';
import { authConfig, prisma } from './utils/config.auth';

dotenv.config();

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/users', userRoutes);
app.use("/auth/*",  ExpressAuth(authConfig))
app.get('/', (req, res) => res.send('Express + TypeScript + Prisma + Auth.js Server is running!'));

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
export const wss = new WebSocketServer({ server });



process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
