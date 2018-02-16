const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`listening at 127.0.0.1: ${port}`);

const square = {
    x: Math.floor(Math.random()*(600) + 1),
    y: Math.floor(Math.random()*(400) + 1),
    width: 100,
    height: 100,
    color: "red"
};

let clicked = false;        //make true after the first click message to avoid making multiple setTimers
let users = {};

//make a new square
const newSquare = () => {
    square.x = Math.floor(Math.random()*(600) + 1);
    square.y = Math.floor(Math.random()*(400) + 1);
    square.color = `rgb(${Math.floor((Math.random()*255) + 1)},${Math.floor((Math.random()*255) + 1)},${Math.floor((Math.random()*255) + 1)})`;
};

//figure out which socket was the first submission
const determineFirstSubmission = () => {
    
};

const io = socketio(app);

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (user) => {
      
    socket.join('room1');
      users[user] = socket;
      socket.emit('draw', square);
  });
};

const onUpdate = (sock) => {
  const socket = sock;

  socket.on('click', (data) => {
    socket.broadcast.to('room1').emit('msg', data);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onUpdate(socket);
});

console.log('Websocket server started');
