/* eslint-disable no-mixed-operators */
import React, { createRef } from 'react';
import io from 'socket.io-client';
import Video from './Video';
import Videos from './Videos';
import Draggable from './draggable';
import Chat from './Chat';
import CancelIcon from '@material-ui/icons/Cancel';
import ScreenShareTwoToneIcon from '@material-ui/icons/ScreenShareTwoTone';
import ChatBubbleOutlineTwoToneIcon from '@material-ui/icons/ChatBubbleOutlineTwoTone';
import FullscreenRoundedIcon from '@material-ui/icons/FullscreenRounded';
import '../styles/Room.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      localStream: null,
      remoteStream: null,
      remoteStreams: [],
      peerConnections: {},
      selectedVideo: null,
      status: 'Please Wait...',
      pcConfig: {            //Setting up STUN server for connection in two different networks
        "iceServers": [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      },
      sdpContraints: {
        'mandatory': {
          'OfferToReceiveAudio': true,
          'OfferToReceiveVideo': true
        }
      },
      messages: [],
      sendChannels: [],
      disconnected: false,
      chatWindow: false,
      fullScreen: false
    }

    this.serviceIp = '/webrtcPeer';

    // this.localVideoRef = createRef();
    // this.remoteVideoRef = createRef();
    this.fileNameRef = createRef("");
    this.mainAppDiv = createRef();
    this.controlsContent = createRef();
    this.fullscreen = createRef();
    this.statusBar = createRef();

    this.socket = null;
    this.senders = [];
    // this.candidates = [];
  };

  getLocalStream = () => {
    const contraints = { video: true, audio: true, options: { mirror: true } };
    navigator.mediaDevices.getUserMedia(contraints)
      .then((stream) => {
        // this.localVideoRef.current.srcObject = stream;
        window.localStream = stream;
        // this.localVideoref.current.srcObject = stream
        // this.pc.addStream(stream);
        this.setState({
          localStream: stream
        })

        this.whoisOnline()
      })
      .catch((error) => {
        console.log('getUserMediaError', error);
      });
  };

  whoisOnline = () => {
    this.sendToPeer('onlinePeers', null, { local: this.socket.id });
  };

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  };

  createPeerConnection = (socketID, callback) => {

    try {
      let pc = new RTCPeerConnection(this.state.pcConfig);
      this.setState({
        localConnection: pc
      })

      // add pc to peerConnections object
      const peerConnections = { ...this.state.peerConnections, [socketID]: pc }
      this.setState({
        peerConnections
      })

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          })
        }
      }

      pc.oniceconnectionstatechange = (e) => {
        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

        //   this.setState({
        //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
        //   })
        // }

      }

      pc.ontrack = (e) => {

        let _remoteStream = null;
        let remoteStreams = this.state.remoteStreams;
        let remoteVideo = {};

        //1. check if streams already exist 
        const rVideos = this.state.remoteStreams.filter(stream => stream.id === socketID);
        //2. if not then add track
        if (rVideos.length) {
          _remoteStream = rVideos[0].stream
          _remoteStream.addTrack(e.track, _remoteStream)
          remoteVideo = {
            ...rVideos[0],
            stream: _remoteStream,
          }
          remoteStreams = this.state.remoteStreams.map(_remoteVideo => {
            return _remoteVideo.id === remoteVideo.id && remoteVideo || _remoteVideo
          })
        }
        else {
          _remoteStream = new MediaStream();
          _remoteStream.addTrack(e.track, _remoteStream);

          remoteVideo = {
            id: socketID,
            name: socketID,
            stream: _remoteStream
          }
          remoteStreams = [...this.state.remoteStreams, remoteVideo]
        }
        //3. if not a new stream and new track
        // const remoteVideo = {
        //   id: socketID,
        //   name: socketID,
        //   stream: e.streams[0]
        // }

        this.setState(prevState => {

          // If we already have a stream in display let it stay the same, otherwise use the latest stream
          // const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] }
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: _remoteStream }


          // get currently selected video
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo.id)
          // if the video is still in the list, then do nothing, otherwise set to new video stream
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo }

          return {
            // selectedVideo: remoteVideo,
            ...selectedVideo,
            // remoteStream: e.streams[0],
            ...remoteStream,
            remoteStreams,
          }
        })
      }

      pc.close = () => {
        // alert('GONE')
      }

      if (this.state.localStream)
        // pc.addStream(this.state.localStream)
        this.state.localStream.getTracks().forEach(track => {
          this.senders.push(pc.addTrack(track, this.state.localStream));
        })

      // return pc
      callback(pc)
    }
    catch (e) {
      console.log('Something went wrong! pc not created!!', e)
      // return;
      callback(null)
    }
  };

  componentDidMount() {
    this.socket = io(
      this.serviceIp,
      {
        path: '/webrtc-video-calling',
        query: {
          room: window.location.pathname
        }
      }
    );

    this.socket.on('connection-success', data => {
      this.getLocalStream()
      const status = data.peerCount > 1 ? `Total Connected Users in room ${window.location.pathname}: ${data.peerCount}` : `Waiting for other users to connect`;
      this.setState({
        status: status,
        messages: data.messages
      })
    });

    this.socket.on('joined-peers', data => {
      this.setState({
        status: data.peerCount > 1 ? `Total Connected Users in room ${window.location.pathname}: ${data.peerCount}` : `Waiting for other users to connect`
      })
    })

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)

      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)

      this.setState(prevState => {
        // check if disconnected peer is the selected video and if there still connected peers, then select the first
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0] } : null

        return {
          // remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
          remoteStreams,
          ...selectedVideo,
          status: data.peerCount > 1 ? `Total Connected Users in room ${window.location.pathname}: ${data.peerCount}` : `Waiting for other users to connect`
        }
      }
      )
    })

    // this.socket.on('offerOrAnswer', (sdp) => {
    //   this.textref.value = JSON.stringify(sdp);
    //   this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    // });

    this.socket.on('candidate', (data) => {
      // this.candidates = [...this.candidates, candidate];
      const pc = this.state.peerConnections[data.socketID];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    this.socket.on('online-peer', socketID => {
      console.log('connected peers ...', socketID)

      // create and send offer to the peer (data.socketID)
      // 1. Create new pc
      this.createPeerConnection(socketID, pc => {
        // 2. Create Offer
        if (pc) {

          // Send Channel
          const handleSendChannelStatusChange = (event) => {
            console.log('send channel status: ' + this.state.sendChannels[0].readyState);
          }

          const sendChannel = pc.createDataChannel('sendChannel');
          sendChannel.onopen = handleSendChannelStatusChange;
          sendChannel.onclose = handleSendChannelStatusChange;

          this.setState(prevState => {
            return {
              sendChannels: [...prevState.sendChannels, sendChannel]
            }
          })


          // Receive Channels
          const handleReceiveMessage = (event) => {
            const message = JSON.parse(event.data);
            console.log(message)
            this.setState(prevState => {
              return {
                messages: [...prevState.messages, message]
              }
            })
          }

          const handleReceiveChannelStatusChange = (event) => {
            if (this.receiveChannel) {
              console.log("receive channel's status has changed to " + this.receiveChannel.readyState);
            }
          }

          const receiveChannelCallback = (event) => {
            const receiveChannel = event.channel
            receiveChannel.onmessage = handleReceiveMessage;
            receiveChannel.onopen = handleReceiveChannelStatusChange;
            receiveChannel.onclose = handleReceiveChannelStatusChange;
          }

          pc.ondatachannel = receiveChannelCallback;


          pc.createOffer(this.state.sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp)

              this.sendToPeer('offer', sdp, {
                local: this.socket.id,
                remote: socketID
              })
            })
        }
      })
    });

    this.socket.on('offer', data => {
      this.createPeerConnection(data.socketID, pc => {
        pc.addStream(this.state.localStream);

        // Send Channel
        const handleSendChannelStatusChange = (event) => {
          console.log('send channel status: ' + this.state.sendChannels[0].readyState);
        }

        const sendChannel = pc.createDataChannel('sendChannel');
        sendChannel.onopen = handleSendChannelStatusChange;
        sendChannel.onclose = handleSendChannelStatusChange;

        this.setState(prevState => {
          return {
            sendChannels: [...prevState.sendChannels, sendChannel]
          }
        })


        // Receive Channels
        const handleReceiveMessage = (event) => {
          const message = JSON.parse(event.data);
          console.log(message)
          this.setState(prevState => {
            return {
              messages: [...prevState.messages, message]
            }
          })
        }

        const handleReceiveChannelStatusChange = (event) => {
          if (this.receiveChannel) {
            console.log("receive channel's status has changed to " + this.receiveChannel.readyState);
          }
        }

        const receiveChannelCallback = (event) => {
          const receiveChannel = event.channel
          receiveChannel.onmessage = handleReceiveMessage;
          receiveChannel.onopen = handleReceiveChannelStatusChange;
          receiveChannel.onclose = handleReceiveChannelStatusChange;
        }

        pc.ondatachannel = receiveChannelCallback;

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          .then(() => {
            pc.createAnswer(this.state.sdpContraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                this.sendToPeer('answer', sdp, {
                  local: this.socket.id,
                  remote: data.socketID
                })
              })
          })
      });

    });

    this.socket.on('answer', data => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]
      console.log(data.sdp)
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => { })
    })


    //hover effect
    this.mainAppDiv.current.addEventListener('mousemove', () => {
      this.controlsContent.current.classList.add('visible');
      this.statusBar.current.classList.add('visible');
      setTimeout(() => {
        this.controlsContent.current.classList.remove('visible');
        this.statusBar.current.classList.remove('visible');
      }, 5000);
    });

  };

  //Switching Video
  switchVideo = (_video) => {
    this.setState({
      selectedVideo: _video
    })
  };

  //Toggle Chat Window
  handleChatWindowToggle = () => {
    if (this.state.chatWindow) {
      this.setState({
        chatWindow: false
      })
    }
    else {
      this.setState({
        chatWindow: true
      })
    }
  };

  //Share Screen
  shareScreen = () => {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
      const screenTrack = stream.getTracks()[0];
      this.senders.find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);
      screenTrack.onended = function () {
        this.senders.find(sender => sender.track.kind === "video")
          .replaceTrack(this.state.localStream.getTracks()[1]);
      }
    })
  };

  handleFullscreen = () => {
    if(this.state.fullScreen === false){
    document.documentElement.requestFullscreen();
    this.setState({
      fullScreen: true
    });
    }
    else{
      document.exitFullscreen();
      this.setState({
        fullScreen: false
      });
    }
  }

  //Sending Large Data Files P2P

  // handleReceivingData = (data) => {

  // };

  // download = () => {

  // };

  // selectFile = (e) => {

  // };

  // sendFile = () => {
  //   console.log('Created local peer connection', this.state.localConnection);
  //   this.sendChannel = this.state.localConnection.createDataChannel('sendDataChannel');
  //   this.sendChannel = 'arraybuffer';
  //   console.log('Created send Data Channel');

  //   this.sendChannel.addEventListener('open', this.onSendChannelStateChange);
  //   this.sendChannel.addEventListener('close', this.onSendChannelStateChange);
  //   this.sendChannel.addEventListener('error', error => console.error('Error in sendChannel:', error));

  // };

  // onSendChannelStateChange = () => {
  //   const readyState = this.sendChannel.readyState;
  //   console.log(`Send channel state is: ${readyState}`);
  //   if (readyState === 'open') {
  //     this.sendData();
  //   }
  // }

  render() {

    if (this.state.disconnected) {
      this.socket.close()
      this.state.localStream.getTracks().forEach(track => track.stop())
      return (<div>You have successfully Disconnected</div>)
    }

    const statusText = <div style={{ color: 'red', padding: 8 }}>{this.state.status}</div>;

    return (
      <div className="app" ref={this.mainAppDiv}>
        <Draggable style={{
          zIndex: 101,
          position: 'absolute',
          right: 0,
          cursor: 'move'
        }}>
          <Video
            videoStyles={{
              zIndex: 2,
              // position: 'absolute',
              // right: 0,
              width: 200,
              // height: 195,
              // margin: 5,
              // backgroundColor: 'black'
            }}
            frameStyle={{
              width: 200,
              margin: 5,
              borderRadius: 5,
              backgroundColor: 'black'

            }}
            showMuteControls={true}
            // ref={this.localVideoRef}
            videoStream={this.state.localStream}
            autoPlay muted
          >
          </Video>
        </Draggable>
        <Video
          videoStyles={{
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgb(27, 38, 56)'
          }}
          // ref={ this.remoteVideoref }
          videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
          autoPlay>
        </Video>

        <br />
        <div className="statusBar" ref={this.statusBar}>
          <div style={{
            margin: 5,
            backgroundColor: '#cdc4ff4f',
            padding: 10,
            borderRadius: 5,

          }}> {statusText}</div>
        </div>
        <div>
          <Videos
            switchVideo={this.switchVideo}
            remoteStreams={this.state.remoteStreams}
          ></Videos>
        </div>
        <br />
        {this.state.chatWindow ? <Chat
          user={{
            uid: this.socket && this.socket.id || ''
          }}
          messages={this.state.messages}
          sendMessage={(message) => {
            this.setState(prevState => {
              return { messages: [...prevState.messages, message] }
            })
            this.state.sendChannels.map(sendChannel => {
              sendChannel.readyState === 'open' && sendChannel.send(JSON.stringify(message))
            })
            this.sendToPeer('new-message', JSON.stringify(message), { local: this.socket.id })
          }}
        /> : <div></div>}

        {/* Controls */}
          <div className="controls-content" ref={this.controlsContent}>
            <div className="controls-body">
              <div className="button-group-left">

                <div onClick={this.handleChatWindowToggle}><ChatBubbleOutlineTwoToneIcon className="control-buttons" /></div>
                <div onClick={this.shareScreen}><ScreenShareTwoToneIcon className="control-buttons" /></div>

              </div>

              <div className="button-group-center" onClick={(e) => { this.setState({ disconnected: true }) }}>
                <CancelIcon className="control-buttons cancel" />

              </div>

              <div className="button-group-right">
              <div className="fullscreenBtn" onClick={this.handleFullscreen}>
                <FullscreenRoundedIcon className="control-buttons" ref={this.fullscreen} />
                </div>
              </div>
            </div>
          </div>

      </div>
    );
  }
}


export default App;
