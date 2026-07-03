import { useEffect, useState, useCallback, useContext } from 'react';
import { socket } from '../services/socket';
import { AuthContext } from '../context/AuthContext';

export const useSocket = (roomId) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [vetoedMovieId, setVetoedMovieId] = useState(null);
  const [partnerVetoReactionTrigger, setPartnerVetoReactionTrigger] = useState(0);
  const [roomPrefs, setRoomPrefs] = useState(null);
  const { user } = useContext(AuthContext);
  const userId = user?._id;

  useEffect(() => {
    if (user === undefined) return; // Wait until AuthContext fully resolves (null is fine for guests)

    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      if (roomId) {
        const prefsStr = localStorage.getItem(`prefs_${roomId}`);
        const prefs = prefsStr ? JSON.parse(prefsStr) : null;
        socket.emit('join_room', { roomId, prefs, userId });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    const onRoomPrefs = (prefs) => {
      if (prefs) {
        localStorage.setItem(`prefs_${roomId}`, JSON.stringify(prefs));
        setRoomPrefs(prefs);
      }
    };

    const onRoomReady = (data) => {
      setPartnerConnected(true);
    };

    const onMatch = (data) => {
      setMatchData(data);
    };

    const onPartnerLeft = () => {
      setPartnerConnected(false);
    };

    const onPartnerVetoedMovie = ({ movieId }) => {
      setVetoedMovieId(movieId);
    };

    const onPartnerVetoReaction = () => {
      setPartnerVetoReactionTrigger(Date.now());
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_prefs', onRoomPrefs);
    socket.on('room_ready', onRoomReady);
    socket.on('match', onMatch);
    socket.on('partner_left', onPartnerLeft);
    socket.on('partner_vetoed_movie', onPartnerVetoedMovie);
    socket.on('partner_veto_reaction', onPartnerVetoReaction);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_prefs', onRoomPrefs);
      socket.off('room_ready', onRoomReady);
      socket.off('match', onMatch);
      socket.off('partner_left', onPartnerLeft);
      socket.off('partner_vetoed_movie', onPartnerVetoedMovie);
      socket.off('partner_veto_reaction', onPartnerVetoReaction);
      socket.disconnect();
    };
  }, [roomId, userId]);

  const emitSwipe = useCallback((type, movieId, movieData) => {
    if (type === 'right') {
      socket.emit('swipe_right', { roomId, movieId, movieData });
    } else if (type === 'veto') {
      socket.emit('swipe_veto', { roomId, movieId });
    } else {
      socket.emit('swipe_left', { roomId, movieId, movieData });
    }
  }, [roomId]);

  const emitVetoReaction = useCallback(() => {
    socket.emit('send_veto_reaction', { roomId });
  }, [roomId]);

  return { isConnected, partnerConnected, matchData, emitSwipe, vetoedMovieId, partnerVetoReactionTrigger, emitVetoReaction, roomPrefs };
};
