import React, { useState, useEffect, useRef } from "react";
import { v1 as uuid } from 'uuid';
import SettingsApplicationsIcon from '@material-ui/icons/SettingsApplications';
import Logo from '../images/video-conference.svg';
import '../styles/CreateRoom.css';

const CreateRoom = (props) => {

  const [roomId, setRoomId] = useState([]);
  const [haveRoomId, setHaveRoomId] = useState(false);

  let roomIdExamples = ['YouOnlyLiveOnce', 'CosmosIsReal', 'ImpossibleIsForTheUnwilling'
    , 'NarrativeStormsSettlePersonally', 'HomeDesktopSacrificeRecklessly', 'ElementaryMusicianPlantOverall'];
  let inputRoomId = useRef();
  let currentText = useRef();
  let letter = useRef();

  useEffect(() => {
    let count = 0;
    let index = 0;
    // let currentText = '';
    // let letter = '';

    (function typing(tme) {
      if (count === roomIdExamples.length) {
        count = 0;
      }
      currentText.current = roomIdExamples[count];
      letter.current = currentText.current.slice(0, ++index);
      if (document.querySelector('.roomIdInput') !== null) {
        document.querySelector('.roomIdInput').placeholder = letter.current;
      }
      if (letter.current.length === currentText.current.length) {
        // setTimeout(() => {
        count++;
        index = 0;
        // }, 2000);
      }
      setTimeout(typing, 300);
    }());
  }, []);



  function create() {
    const id = uuid();
    if (document.querySelector('.roomIdInput').value === '') {
      setRoomId(currentText.current);
    }
    props.history.push(`/${roomId}`);
  }

  const updateInputValue = (value) => {
    setRoomId(value);
    // document.querySelector('.roomIdInput').defaultValue = roomId;
  }

  const handleJoinRoom = () => {
    if(haveRoomId === false){
      setHaveRoomId(true);
    }
    else{
      setHaveRoomId(false);
    }
  }

  return (
    <div className="createRoom">
      <div className="heading">
        <div className="logo">
          <img src={Logo} alt="logo" />
          <h1 className="logo-name">Rova Meet</h1>
        </div>
        <SettingsApplicationsIcon className="settings" />
      </div>

      {haveRoomId ? <div className="join-room">
        <div className="join-room-container">
          <form onSubmit={create}>
            <input
              aria-disabled="false"
              aria-label="Meeting"
              className="roomIdInput"
              type="text"
              pattern="^[^?&amp;:&quot;'%#]+$"
              onChange={e => updateInputValue(e.target.value)}
              ref={inputRoomId}
              title="Meeting name should not contain any of these characters: ?, &amp;, :, ', &quot;, %, #."/>
          </form>
        </div>
        <button
          aria-disabled="false"
          aria-label="Join meeting"
          className="joinRoomIdButton"
          onClick={create}>
          Join Room
          </button>
      </div> : <div className="enter-room">
        <div className="enter-room-container">
          <form onSubmit={create}>
            <input
              aria-disabled="false"
              aria-label="Meeting"
              className="roomIdInput"
              type="text"
              pattern="^[^?&amp;:&quot;'%#]+$"
              onChange={e => updateInputValue(e.target.value)}
              ref={inputRoomId}
              title="Meeting name should not contain any of these characters: ?, &amp;, :, ', &quot;, %, #."
            />
          </form>
        </div>
        <button
          aria-disabled="false"
          aria-label="Start meeting"
          className="createRoomIdButton"
          onClick={create}>
          Create Room
          </button>
      </div>}

      <div className="roomIdQues-container">
        <h5 className="roomIdQuestion">Already have a Room ID?</h5>
        <button className="joinRoomQuesBtn" onClick={handleJoinRoom}>Join Room</button>
      </div>
    </div>
  );
}

export default CreateRoom;
