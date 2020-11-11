/* eslint-disable no-mixed-operators */
require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');

var io = require('socket.io')({
  path: '/webrtc-video-calling'
});

const rooms = {};
const messages = {};

app.use(express.static(__dirname + '/webrtc-video-calling/build'));

// app.get("/service-worker.js", (req, res) => {
//   res.sendFile(__dirname, "/webrtc-video-calling/public/service-worker.js");
// });

app.get('/', (req, res, next) => {   //default room if room is not specified
  console.log(__dirname);
  res.sendFile(__dirname + '/webrtc-video-calling/build/index.html');
});

app.get('/:room', (req, res, next) => {
  console.log(__dirname);
  res.sendFile(__dirname + '/webrtc-video-calling/build/index.html');
});

if(process.env.NODE_ENV === 'production'){
  app.use(express.static(path.join(__dirname, 'webrtc-video-calling/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + "webrtc-video-calling", "build", "index.html"));
  })
}

const port = process.env.PORT || 5000;

const server = app.listen(port);

io.listen(server);

const peers = io.of('/webrtcPeer');

// let connectedPeers = new Map();

peers.on('connection', socket => {

  const room = socket.handshake.query.room;

  rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket);  //check if the room already exist
  messages[room] = messages[room] || [];

  // connectedPeers.set(socket.id, socket);

  console.log(socket.id);
  socket.emit('connection-success', {
    success: socket.id,
    peerCount: rooms[room].size,
    messages: messages[room]
  })

  // const broadcast = () => socket.broadcast.emit('joined-peers', {
  //   peerCount: connectedPeers.size
  // });

  const broadcast = () => {
    const connectedPeers = rooms[room];

    for (const [socketID, _socket] of connectedPeers.entries()) {
      if (socketID !== socket.id) {
        _socket.emit('joined-peers', {
          peerCount: rooms[room].size
        })
      }
    }
  }
  broadcast();


  // const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
  //   peerCount: connectedPeers.size,
  //   socketID: socketID
  // })

  const disconnectedPeer = (socketID) => {
    const connectedPeers = rooms[room];

    for (const [_socketID, _socket] of connectedPeers.entries()) {
      _socket.emit('peer-disconnected', {
        peerCount: rooms[room].size,
        socketID
      })
    }
  };

  socket.on('new-message', (data) => {
    // console.log('new-message', JSON.parse(data.payload));
    messages[room] = [...messages[room], JSON.parse(data.payload)];
  });

  socket.on('disconnect', () => {
    // console.log('disconnected');
    // connectedPeers.delete(socket.id);
    rooms[room].delete(socket.id);
    disconnectedPeer(socket.id);
  });

  //SendingListOfPeersConnectedToNewClient
  socket.on('onlinePeers', (data) => {
    const connectedPeers = rooms[room];
    for (const [socketID, _socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID.local) {
        // console.log('online-peer', data.socketID, socketID)
        socket.emit('online-peer', socketID)
      }
    }
  });

  socket.on('offer', data => {
    const connectedPeers = rooms[room];
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        // console.log(socketID, data.payload.type);
        socket.emit('offer', {
          sdp: data.payload,
          socketID: data.socketID.local
        });
      }
    }
  });

  socket.on('answer', (data) => {
    const connectedPeers = rooms[room];
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        socket.emit('answer', {
          sdp: data.payload,
          socketID: data.socketID.local
        })
      }
    }
  })

  //OfferOrAnswer signaling server
  // socket.on('offerOrAnswer', (data) => {
  //   for (const [socketID, socket] of connectedPeers.entries()) {
  //     if (socketID !== data.socketID) {
  //       console.log(socketID, data.payload.type);
  //       socket.emit('offerOrAnswer', data.payload);
  //     }
  //   }
  // });

  //Candidate signaling server
  socket.on('candidate', (data) => {
    const connectedPeers = rooms[room];
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        // console.log(socketID, data.payload);
        socket.emit('candidate', {
          candidate: data.payload,
          socketID: data.socketID.local
        });
      }
    }
  });
});


