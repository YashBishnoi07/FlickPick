import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import WaitingRoom from './WaitingRoom';
import SwipeDeck from './SwipeDeck';
import MatchScreen from './MatchScreen';

const RoomCoordinator = () => {
  const { roomId } = useParams();
  const { isConnected, partnerConnected, matchData, emitSwipe, vetoedMovieId, partnerVetoReactionTrigger, emitVetoReaction, roomPrefs } = useSocket(roomId);

  const [view, setView] = useState('WAITING'); // WAITING, SWIPING, MATCHED

  useEffect(() => {
    if (matchData) {
      setView('MATCHED');
    } else if (partnerConnected) {
      setView('SWIPING');
    } else {
      setView('WAITING');
    }
  }, [partnerConnected, matchData]);

  if (view === 'WAITING') {
    return <WaitingRoom roomId={roomId} isConnected={isConnected} />;
  }

  if (view === 'MATCHED') {
    return (
      <MatchScreen matchData={matchData} onKeepSwiping={() => setView('SWIPING')} />
    );
  }

  return (
    <SwipeDeck 
      roomId={roomId} 
      emitSwipe={emitSwipe} 
      partnerConnected={partnerConnected} 
      vetoedMovieId={vetoedMovieId}
      partnerVetoReactionTrigger={partnerVetoReactionTrigger}
      emitVetoReaction={emitVetoReaction}
      roomPrefs={roomPrefs}
    />
  );
};

export default RoomCoordinator;
