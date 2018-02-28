// initialize add ons
const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const xxh = require('xxhashjs');

// get the port
const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read in the webpage
const index = fs.readFileSync(`${__dirname}/../client/index.html`);

// send the client the webpage
const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

// initialize the server
const app = http.createServer(onRequest).listen(port);

console.log(`listening at 127.0.0.1: ${port}`);

// make the initial difficulty squares
const easySquare = {
  x: Math.floor((Math.random() * (600)) + 1),
  y: Math.floor((Math.random() * (400)) + 1),
  width: 100,
  height: 100,
  color: 'red',
};

const mediumSquare = {
  x: Math.floor((Math.random() * (675)) + 1),
  y: Math.floor((Math.random() * (475)) + 1),
  width: 25,
  height: 25,
  color: 'red',
};

const hardSquare = {
  x: Math.floor((Math.random() * (690)) + 1),
  y: Math.floor((Math.random() * (490)) + 1),
  width: 10,
  height: 10,
  color: 'red',
};

// make true after the first click message to avoid making multiple setTimers for each room
let easyClicked = false;
let mediumClicked = false;
let hardClicked = false;

// stores users in each room
const easyUsers = {};
const mediumUsers = {};
const hardUsers = {};

// make a new square
const newSquare = (difficulty) => {
  let square;

  // assign the difficulty square to square
  if (difficulty === 'easy') {
    square = easySquare;
  } else if (difficulty === 'medium') {
    square = mediumSquare;
  } else {
    // done as an else to avoid server dying from any odd difficulty value being passed in
    square = hardSquare;
  }

  // set new x, y and color values for the square
  square.x = Math.floor((Math.random() * (700 - square.width)) + 1);
  square.y = Math.floor((Math.random() * (500 - square.height)) + 1);
  square.color = `rgb(${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)},${Math.floor((Math.random() * 255) + 1)})`;

  return square;
};

// start the websockets
const io = socketio(app);

// figure out which socket was the first to click the square
const determineFirstSubmission = (difficulty) => {
  
    let users;      //array of users in this room
    
    //get the user array for this room
    if (difficulty === 'easy') {
        users = easyUsers;
     } else if (difficulty === 'medium') {
        users = mediumUsers;
     } else {
        // done as an else to avoid server dying from any odd difficulty value being passed in
        users = hardUsers;
     }
    let keys = Object.keys(users);
    
    //loop through and find who clicked first
    let firstSocket = users[keys[0]]; // earliest click user
    for (var i = 1; i < keys.length; i++){
        let player = users[keys[i]];
        
        if (player.time < firstSocket.time){
            //reset firstSocket's time to integer max
            firstSocket.time = Number.MAX_SAFE_INTEGER;
            firstSocket = player;
        }
        else{
            //reset this user's time to integer max
            player.time = Number.MAX_SAFE_INTEGER;
        }
    }
    
    //increment firstsocket's score
    firstSocket.score += 1;

  // send the first person their points
  io.sockets.in(`${firstSocket.difficulty}`).emit('point', {
        hash: firstSocket.hash, name: firstSocket.name, score: firstSocket.score, first: true,
  });
    
    //reset firstSocket's time
    firstSocket.time = Number.MAX_SAFE_INTEGER;

  // generate new square
  const square = newSquare(difficulty);

  // assign square to the difficulty square
  if (difficulty === 'easy') {
    easySquare.x = square.x;
    easySquare.y = square.y;
    easySquare.color = square.color;
    easyClicked = false;
  } else if (difficulty === 'medium') {
    mediumSquare.x = square.x;
    mediumSquare.y = square.y;
    mediumSquare.color = square.color;
    mediumClicked = false;
  } else {
    // done as an else to avoid server dying from any odd difficulty value being passed in
    hardSquare.x = square.x;
    hardSquare.y = square.y;
    hardSquare.color = square.color;
    hardClicked = false;
  }

  // send the new square to the users in the difficulty room
  io.sockets.in(`${difficulty}`).emit('draw', square);
};

// remove the user from their current room and send that info to the server
const leaveRoom = (sock) => {
  const socket = sock;

  // remove user from the room
  // delete users.online[socket.name];
  socket.leave(`${socket.difficulty}`);
  if (socket.difficulty === 'easy') {
    delete easyUsers[socket.hash];
  } else if (socket.difficulty === 'medium') {
    delete mediumUsers[socket.hash];
  } else {
    // done as an else to avoid server dying from any odd difficulty value being passed in
    delete hardUsers[socket.hash];
  }

  // send the departed user's hash to clients
  io.sockets.in(`${socket.difficulty}`).emit('left', socket.hash);
};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    socket.join(`${data.difficulty}`);

    // set the user's stats for the new room
    socket.difficulty = data.difficulty;
    socket.name = data.name;
    socket.score = 0;
    socket.hash = xxh.h32(`${socket.id}${Date.now()}`, 0xDEADBEEF).toString(16);
      socket.time = Number.MAX_SAFE_INTEGER;
    console.log(`Joined ${data.difficulty} room`);

    let square;

    // assign the difficulty square to square and store the user in the room list
    if (data.difficulty === 'easy') {
      square = easySquare;
      easyUsers[socket.hash] = socket;
    } else if (data.difficulty === 'medium') {
      square = mediumSquare;
      mediumUsers[socket.hash] = socket;
    } else {
      // done as an else to avoid server dying from any odd difficulty value being passed in
      square = hardSquare;
      hardUsers[socket.hash] = socket;
    }

    // send the square
    socket.emit('draw', square);

    // send the user themself
    socket.emit('joined', {
      hash: socket.hash, name: socket.name, score: socket.score, first: false,
    });
  });
};

const onUpdate = (sock) => {
  const socket = sock;

  socket.on('click', (data) => {
    // get the correct square
    let square;

    // assign the difficulty square to square
    if (socket.difficulty === 'easy') {
      square = easySquare;
    } else if (socket.difficulty === 'medium') {
      square = mediumSquare;
    } else {
      // done as an else to avoid server dying from any odd difficulty value being passed in
      square = hardSquare;
    }

    // check that the square the user clicked is the same squafe currently stored
    // if it isnt, send the correct square
    if (data.x === square.x && data.y === square.y) {
      // set the time of the message being received and store the socket in users
      socket.time = new Date().getTime();
      socket.score += 1;

      // send the point for clicking to the user
      io.sockets.in(`${socket.difficulty}`).emit('point', {
        hash: socket.hash, name: socket.name, score: socket.score, first: false,
      });

      // check if a click has been made in the current room
      // if not then set the timer for new squares
      if (socket.difficulty === 'easy' && !easyClicked) {
        easyClicked = true;
        setTimeout(() => {
          determineFirstSubmission(socket.difficulty);
        }, 500);
      } else if (socket.difficulty === 'medium' && !mediumClicked) {
        mediumClicked = true;
        setTimeout(() => {
          determineFirstSubmission(socket.difficulty);
        }, 500);
      } else if (socket.difficulty === 'hard' && !hardClicked) {
        hardClicked = true;
        setTimeout(() => {
          determineFirstSubmission(socket.difficulty);
        }, 500);
      }
    } else {
      // send the user the correct square
      socket.emit('draw', square);
    }
  });

  // handle user changing difficulty
  socket.on('quit', () => {
    // call the leaveRoom function
    leaveRoom(socket);
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    // call the leaveRoom function
    leaveRoom(socket);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onUpdate(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
