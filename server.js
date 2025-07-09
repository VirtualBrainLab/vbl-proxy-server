const express = require("express");
const cors = require("cors");

// App setup
const port = process.env.PORT || 5000
const app = express();

// Configure CORS for Express (for regular HTTP requests)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://data.virtualbrainlab.org',
      'https://pinpoint.allenneuraldynamics-test.org',
      'https://pinpoint.allenneuraldynamics.org'
    ];
    
    // Check if the origin starts with any of our allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Trust proxy (important for AWS load balancer)
app.set('trust proxy', true);

// Add middleware to log requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.get('Origin')} - IP: ${req.ip}`);
  next();
});

// Health check endpoint for load balancer
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const server = app.listen(port, function () {
  console.log(`Listening on port ${port}`);
  console.log('Server configured for AWS load balancer with proxy trust enabled');
});

// Socket setup
const io = require("socket.io")(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://data.virtualbrainlab.org',
        'https://pinpoint.allenneuraldynamics-test.org',
        'https://pinpoint.allenneuraldynamics.org'
      ];
      
      // Check if the origin starts with any of our allowed origins
      const isAllowed = allowedOrigins.some(allowedOrigin => 
        origin.startsWith(allowedOrigin)
      );
      
      if (isAllowed) {
        console.log('Socket.IO allowing origin:', origin);
        callback(null, true);
      } else {
        console.log('Socket.IO CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  maxHttpBufferSize: 1e8, // Set the maximum packet size to 100MB
  allowEIO3: true, // Allow older clients to connect
  transports: ['websocket', 'polling'] // Explicitly allow both transports
});

ID2Socket = {}; // keeps track of all sockets with the same ID
Socket2ID = {}; // keeps track of the ID of each socket
Socket2Type = {};

reserved_messages = [
  'connection',
  'disconnect',
  'ID',
  'CameraImgMeta',
  'CameraImg',
  'ReceiveCameraImgMeta',
  'ReceiveCameraImg',
  'NeuronCallback',
  'log',
  'log-warning',
  'log-error',
  'urchin-loaded-callback',
  'urchin-dock-callback'
];

io.on("connection", function (socket) {
  console.log("Client connected with ID: " + socket.id);

  socket.on('disconnect', () => {
  	console.log('Client disconnected with ID: ' + socket.id);

  	if (ID2Socket[Socket2ID[socket.id]]) {
      ID2Socket[Socket2ID[socket.id]].splice(ID2Socket[Socket2ID[socket.id]].indexOf(socket.id),1);
      Socket2ID[socket.id] = undefined;
  	}
  })

  socket.on('ID', function(clientData) {
    // ID is just a unique identifier, it can be any string
    newClientID = clientData[0]
    // Type can be "send" or "receive"
    newClientType = clientData[1]


  	console.log('Client ' + socket.id + ' requested to update ID to ' + newClientID);
  	// Check if we have an old clientID that needs to be removed
  	if (Socket2ID[socket.id]) {
  		oldClientID = Socket2ID[socket.id]

  		ID2Socket[oldClientID].splice(ID2Socket[oldClientID].indexOf(socket.id),1);
  	}

  	if (ID2Socket[newClientID] == undefined) {
  		// save the new entry into a new list
  		ID2Socket[newClientID] = [socket.id];
  	}
  	else {
  		// save the new entry
  		ID2Socket[newClientID].push(socket.id);
  	}
  	// update the client ID locally
	  Socket2ID[socket.id] = newClientID;
    Socket2Type[socket.id] = newClientType
  	console.log('User updated their ID to: ' + Socket2ID[socket.id] + " type " + newClientType );
  	console.log('All connected clients with ID: ' + ID2Socket[Socket2ID[socket.id]]);
  });


  // Make sure that these receive events are listed in the reserved_messages list
  
  // Camera receive events
  socket.on('CameraImgMeta', function(data) {
    emitToSender(socket.id, 'CameraImgMeta', data);
  });
  socket.on('CameraImg', function(data) {
    emitToSender(socket.id, 'CameraImg', data);
  });
  socket.on('ReceiveCameraImgMeta', function(data) {
    emitToSender(socket.id, 'ReceiveCameraImgMeta', data);
  });
  socket.on('ReceiveCameraImg', function(data) {
    emitToSender(socket.id, 'ReceiveCameraImg', data);
  });
  socket.on('NeuronCallback', function(data) {
    emitToSender(socket.id, 'NeuronCallback', data);
  });
  socket.on('urchin-dock-callback', function(data) {
    emitToSender(socket.id, 'urchin-dock-callback', data);
  });
  socket.on('urchin-loaded-callback', function(data) {
    emitToSender(socket.id, 'urchin-loaded-callback', data);
  });
  
  // Receiver events
  socket.on('log', function(data) {
    emitToSender(socket.id, 'log', data);
  });
  socket.on('log-warning', function(data) {
    emitToSender(socket.id, 'log-warning', data);
  });
  socket.on('log-error', function(data) {
    emitToSender(socket.id, 'log-error', data);
  });

  // For all remaining events, asssume they are a sender -> receiver broadcast and emit them automatically
  socket.onAny((eventName, data) => {
    if (!reserved_messages.includes(eventName)) {
      emitToReceiver(socket.id, eventName, data);
    }
  });

});

function emitToReceiver(id, event, data) {
  console.log('Sender sent event: ' + event + ' emitting to all clients with ID: ' + Socket2ID[id] + " and type receive");
  for (var socketID of ID2Socket[Socket2ID[id]]) {
    if (Socket2Type[socketID]=="receive") {
      console.log('Emitting to: ' + socketID);
      io.to(socketID).emit(event,data);
    }
  }
}

function emitToSender(id, event, data) {
  console.log('Receiver sent event: ' + event + ' emitting to all clients with ID: ' + Socket2ID[id] + " and type send");
  for (var socketID of ID2Socket[Socket2ID[id]]) {
    if (Socket2Type[socketID]=="send") {
      console.log('Emitting to: ' + socketID);
      io.to(socketID).emit(event,data);
    }
  }
}
