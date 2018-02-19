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
  x: Math.floor((Math.random() * (600)) + 1),
  y: Math.floor((Math.random() * (400)) + 1),
  width: 100,
  height: 100,
  color: 'red',
};

let clicked = false; // make true after the first click message to avoid making multiple setTimers
let users = {}; // users who clicked the square

// make a new square
const newSquare = () => {
  square.x = Math.floor((Math.random() * (600)) + 1);
  square.y = Math.floor((Math.random() * (400)) + 1);
  square.color = `rgb(${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)})`;
};

const io = socketio(app);

// figure out which socket was the first submission
const determineFirstSubmission = () => {
  // let firstSocket; // earliest click user

  // foreach of users here
  // if (user.time < firstSocket.time) {
  // firstSocket = user;
  // }


  // send the first person their points
  // firstSocket.emit('point', { score: 1, first: true });

  // generate new square and send it ot the users
  newSquare();
  clicked = false;
  io.sockets.in('room1').emit('draw', square);

  // empty users
  users = {};
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (user) => {
    socket.join('room1');
    // set the users name
    socket.name = user;

    // send the square
    socket.emit('draw', square);
  });
};

const onUpdate = (sock) => {
  const socket = sock;

  socket.on('click', (data) => {
    // check that the square the user clicked is the same squafe currently stored
    // if it isnt, send the correct square
    if (data.x === square.x && data.y === square.y) {
      // set the time of the message being received and store the socket in users
      socket.time = new Date().getTime();
      users[socket.name] = socket;
      // send the point for clicking to the user
      socket.emit('point', { score: 1, first: false });

      // check if a click has been made, if not then set the timer for new squares
      if (!clicked) {
        clicked = true;
        setTimeout(determineFirstSubmission, 100);
      }
    } else {
      // send the user the correct square
      socket.emit('draw', square);
    }
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onUpdate(socket);
});

console.log('Websocket server started');
