import React, { useState, useEffect } from "react";
import PubNub from "pubnub";

const getUUID = () => {
  let uuid = localStorage.getItem("pubnub_uuid");
  if (!uuid) {
    uuid = PubNub.generateUUID();
    localStorage.setItem("pubnub_uuid", uuid);
  }
  return uuid;
};

const pubnub = new PubNub({
  publishKey: process.env.REACT_APP_PUBLISH_KEY,
  subscribeKey: process.env.REACT_APP_SUBSCRIBE_KEY,
  uuid: getUUID(),
});

const Game = () => {
  const [player, setPlayer] = useState("");
  const [opponentMove, setOpponentMove] = useState("");
  const [result, setResult] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [isRoomCreator, setIsRoomCreator] = useState(false);

  useEffect(() => {
    pubnub.addListener({
      message: handleMessage,
    });
    // Subscribe to global channel for room creation messages
    pubnub.subscribe({ channels: ["rps-room"] });
  }, []);

  const handleMessage = (message) => {
    const { move, sender, roomId } = message.message;
    if (roomId === pubnub.getUUID()) {
      // Message for this player's room
      if (sender !== pubnub.getUUID()) {
        setOpponentMove(move);
      }
    }
  };

  const createRoom = () => {
    const roomId = Math.random().toString(36).substr(2, 6);
    setRoomId(roomId);
    setPlayer(pubnub.getUUID()); // Use the generated UUID here
    setIsRoomCreator(true);
    // Publish the room ID
    pubnub.publish({
      channel: "rps-room",
      message: { roomId, action: "create" },
    });
  };

  const joinRoom = () => {
    // Check if roomId is not empty
    if (roomId.trim() !== "") {
      // Subscribe to the specific room's channel
      pubnub.subscribe({ channels: [roomId] });
      // Publish to the room that you've joined
      pubnub.publish({
        channel: "rps-room",
        message: { roomId, action: "join", sender: pubnub.getUUID() },
      });
    } else {
      // Handle empty roomId input
      alert("Please enter a valid Room ID.");
    }
  };

  const handleMove = (move) => {
    if (!gameStarted) {
      setPlayer(move);
      setGameStarted(true);
      pubnub.publish({
        channel: roomId,
        message: { move, sender: pubnub.getUUID(), roomId },
      });
      setTimeout(() => {
        determineWinner();
      }, 2000);
    }
  };

  const determineWinner = () => {
    if (player && opponentMove) {
      if (player === opponentMove) {
        setResult("It's a tie!");
      } else if (
        (player === "rock" && opponentMove === "scissors") ||
        (player === "paper" && opponentMove === "rock") ||
        (player === "scissors" && opponentMove === "paper")
      ) {
        setResult("You win!");
      } else {
        setResult("You lose!");
      }
    }
  };

  return (
    <div>
      {!roomId && (
        <div>
          <h1>Rock, Paper, Scissors</h1>
          <button onClick={createRoom}>Create Room</button>
          <input
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      )}
      {roomId && !gameStarted && (
        <div>
          <h2>Room ID: {roomId}</h2>
          <h3>Waiting for opponent...</h3>
        </div>
      )}
      {gameStarted && (
        <div>
          <h2>Choose your move:</h2>
          <button onClick={() => handleMove("rock")}>Rock</button>
          <button onClick={() => handleMove("paper")}>Paper</button>
          <button onClick={() => handleMove("scissors")}>Scissors</button>
        </div>
      )}
      {result && (
        <div>
          <h2>{result}</h2>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default Game;
