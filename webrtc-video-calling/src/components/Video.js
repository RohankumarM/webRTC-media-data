import React from 'react';
import SettingsIcon from '@material-ui/icons/Settings';
import '../styles/Video.css';

class Video extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mic: true,
      camera: true,
      settings: false
    };
  }

  componentDidMount() {
    if (this.props.videoStream) {
      this.video.srcObject = this.props.videoStream
    }
  }

  componentWillReceiveProps(nextProps) {
    console.log(nextProps.videoStream);
    if (nextProps.videoStream && nextProps.videoStream !== this.props.videoStream) {
      this.video.srcObject = nextProps.videoStream;
    }
  }

  muteMicHandler = (e) => {
    const stream = this.video.srcObject.getTracks().filter(track => track.kind === 'audio');
    this.setState(prevState => {
      if(stream){
        stream[0].enabled = !prevState.mic
      }
      return {mic: !prevState.mic}
    })
  };

  muteVideoHandler = (e) => {
    const stream = this.video.srcObject.getTracks().filter(track => track.kind === 'video');
    this.setState(prevState => {
      if(stream){
        stream[0].enabled = !prevState.camera
      }
      return {camera: !prevState.camera}
    })
  };

  render() {
    const muteControls = this.props.showMuteControls && (
      <div className="local-video-controls">
        <SettingsIcon className="settings" />
        <i onClick={this.muteMicHandler} style={{cursor: 'pointer', padding: 5, fontSize: 25, color: this.state.mic ? 'white' : 'red'}} className="material-icons">
          {this.state.mic ? 'mic' : 'mic_off'}
        </i>
        <i onClick={this.muteVideoHandler} style={{cursor: 'pointer', padding: 5, fontSize: 25, color: this.state.camera ? 'white' : 'red'}} className="material-icons">
          {this.state.camera ? 'videocam' : 'videocam_off'}
        </i>
      </div>
    )
    return (
      <div
        style={{ ...this.props.frameStyle }}
      >
        <video
          id={this.props.id}
          muted={this.props.muted}
          autoPlay
          style={{ ...this.props.videoStyles }}
          // ref={ this.props.videoRef }
          ref={(ref) => { this.video = ref }}
        ></video>
        {muteControls}
      </div>
    )
  }
};

export default Video;
