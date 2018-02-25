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

const easySquare = {
  x: Math.floor((Math.random() * (600)) + 1),
  y: Math.floor((Math.random() * (400)) + 1),
  width: 100,
  height: 100,
  color: 'red',
};

const mediumSquare = {
  x: Math.floor((Math.random() * (650)) + 1),
  y: Math.floor((Math.random() * (450)) + 1),
  width: 50,
  height: 50,
  color: 'red',
};

const hardSquare = {
  x: Math.floor((Math.random() * (675)) + 1),
  y: Math.floor((Math.random() * (475)) + 1),
  width: 25,
  height: 25,
  color: 'red',
};

let clicked = false; // make true after the first click message to avoid making multiple setTimers
// stores users who clicked the square
let easyClick = {}; 
let mediumClick = {}; 
let hardClick = {}; 

// make a new square
const newSquare = (difficulty) => {
    let square;
    
    //assign the difficulty square to square
    if (difficulty === "easy"){
        square = easySquare;
    }
    else if (difficulty === "medium"){
        square = mediumSquare;
    }
    else{
        //done as an else to avoid server dying from any odd difficulty value being passed in
        square = hardSquare;
    }
    
  square.x = Math.floor((Math.random() * (700 - square.width)) + 1);
  square.y = Math.floor((Math.random() * (500 - square.height)) + 1);
  square.color = `rgb(${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)})`;
    
    return square;
};

const io = socketio(app);

// figure out which socket was the first submission
const determineFirstSubmission = (difficulty) => {
  // let firstSocket; // earliest click user

  // foreach of users here
  // if (user.time < firstSocket.time) {
  // firstSocket = user;
  // }


  // send the first person their points
  // firstSocket.emit('point', { score: 1, first: true });

  // generate new square
  let square = newSquare(firstSocket.difficulty);
  clicked = false;
    
    //assign square to the difficulty square
    if (firstSocket.difficulty === "easy"){
        easySquare = square;
    }
    else if (firstSocket.difficulty === "medium"){
        mediumSquare = square;
    }
    else{
        //done as an else to avoid server dying from any odd difficulty value being passed in
        hardSquare = square;
    }
    
    //send the new square to the users in the difficulty room
  io.sockets.in(`${firstSocket.difficulty}`).emit('draw', square);

  // empty users
  //assign square to the difficulty square
    if (firstSocket.difficulty === "easy"){
        easyClick = {};
    }
    else if (firstSocket.difficulty === "medium"){
        mediumClick = {};
    }
    else{
        //done as an else to avoid server dying from any odd difficulty value being passed in
        hardClick = {};
    }
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (difficulty) => {
    socket.join(`${difficulty}`);
    // set the users name
    socket.difficulty = difficulty;
      
    let square;
    
    //assign the difficulty square to square
    if (difficulty === "easy"){
        square = easySquare;
    }
    else if (difficulty === "medium"){
        square = mediumSquare;
    }
    else{
        //done as an else to avoid server dying from any odd difficulty value being passed in
        square = hardSquare;
    }
      
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
        
        //assign the difficulty square to square
        if (difficulty === "easy"){
            easyClick[socket.name] = socket;
        }
        else if (difficulty === "medium"){
            mediumClick[socket.name] = socket;
        }
        else{
            //done as an else to avoid server dying from any odd difficulty value being passed in
            hardClick[socket.name] = socket;
        }
      
      // send the point for clicking to the user
      socket.emit('point', { score: 1, first: false });

      // check if a click has been made, if not then set the timer for new squares
      if (!clicked) {
        clicked = true;
        setTimeout(() => {
            determineFirstSubmission(socket.difficulty);
        }, 1000);
      }
    } else {
        let square;
    
        //assign the difficulty square to square
        if (difficulty === "easy"){
            square = easySquare;
        }
        else if (difficulty === "medium"){
            square = mediumSquare;
        }
        else{
            //done as an else to avoid server dying from any odd difficulty value being passed in
            square = hardSquare;
        }
      // send the user the correct square
      socket.emit('draw', square);
    }
  });
};

const onDisconnect = (sock) => {
    const socket = sock;
    
    socket.on('disconnect', () => {
        // remove user from the room
        //delete users.online[socket.name];
        socket.leave(`${socket.difficulty}`);
    });
    
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onUpdate(socket);
    onDisconnect(socket);
});

console.log('Websocket server started');
