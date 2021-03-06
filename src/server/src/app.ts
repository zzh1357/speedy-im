import express, {
  Application, Request, Response, NextFunction,
} from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import socketIO from 'socket.io';
import debug from 'debug';
// import path from 'path';
import expressJwt from 'express-jwt';
import config from './config';
import indexRouter from './routes';
import userRouter from './routes/user';
import Util from './helper/util';
import SocketAuth from './socket/auth';
import Chat from './socket/chat';

const log = debug('speedy-im');
const isDev = process.env.NODE_ENV === 'development';
const { jwt } = config;

const app: Application = express();
const server: http.Server = new http.Server(app);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const io: socketIO.Server = socketIO(server, {
  pingInterval: 5000,
  pingTimeout: 5000,
});
io.use(SocketAuth);
new Chat(io).setup();

app.use(cors());
app.use(logger(isDev ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use(
  expressJwt({
    secret: jwt.secret,
    getToken: (req: Request) => req.body.token || req.query.token || req.headers['x-access-token'],
  })
    .unless({
      path: jwt.routeWhiteList,
    }),
);

app.use('/', indexRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((req, res, next) => {
  res.json(Util.fail('not found', 404));
});

// 500 error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: { message: string; status: number; name: string; }, req: Request, res: Response, _: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    return res.json(Util.fail('invalid token', 401));
  }

  return res.json(Util.success({
    message: err.message,
    error: isDev ? err : {},
  }, err.status || 500, '内部服务器错误'));
});

server.listen(8360, () => {
  log('IM 服务在 8360端口启动');
});
