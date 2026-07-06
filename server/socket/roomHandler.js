import Match from '../models/Match.js';
import Like from '../models/Like.js';
import Swipe from '../models/Swipe.js';
import RoomSession from '../models/RoomSession.js';

export const setupRoomHandlers = (io, socket, rooms) => {
  socket.on('join_room', async ({ roomId, prefs, userId }) => {
    socket.join(roomId);
    
    // Attempt to rehydrate room from DB if it doesn't exist in memory
    if (!rooms.has(roomId)) {
      let savedSession = null;
      try {
        savedSession = await RoomSession.findOne({ roomId });
      } catch (err) {
        console.error("Error fetching room session:", err);
      }

      rooms.set(roomId, {
        users: new Map(),
        swipes: {},
        vetoes: {},
        prefs: savedSession ? savedSession.prefs : (prefs || { services: '', genres: '' })
      });
      
      // If we didn't find one and we have prefs, save the new session
      if (!savedSession && prefs && (prefs.services || prefs.genres)) {
        RoomSession.create({ roomId, prefs }).catch(err => console.error(err));
      }
    } else if (prefs && (prefs.services || prefs.genres)) {
      // Update memory and DB
      rooms.get(roomId).prefs = prefs;
      RoomSession.findOneAndUpdate(
        { roomId },
        { prefs },
        { upsert: true }
      ).catch(err => console.error(err));
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, userId || null);
    if (!room.swipes[socket.id]) {
      room.swipes[socket.id] = new Set();
    }

    console.log(`Socket ${socket.id} joined room ${roomId}. Users in room: ${room.users.size}`);

    // Send the room's stored preferences to the user who just joined
    socket.emit('room_prefs', room.prefs);

    if (room.users.size >= 2) {
      io.to(roomId).emit('room_ready', {
        message: 'Partner connected!'
      });
    }
  });

  socket.on('swipe_right', ({ roomId, movieId, movieData }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.swipes[socket.id]) {
        room.swipes[socket.id] = new Set();
    }
    room.swipes[socket.id].add(movieId);

    // Save Like and Swipe to DB
    const userId1 = room.users.get(socket.id);
    if (userId1) {
      Like.findOneAndUpdate(
        { userId: userId1, movieId },
        { movieId, movieData },
        { upsert: true, new: true }
      ).catch(err => console.error("Error saving like:", err));

      Swipe.findOneAndUpdate(
        { userId: userId1, movieId },
        { movieId, movieData, direction: 'right' },
        { upsert: true, new: true }
      ).catch(err => console.error("Error saving swipe:", err));
    }

    const otherUsers = Array.from(room.users.keys()).filter(id => id !== socket.id);
    if (otherUsers.length > 0) {
      const partnerId = otherUsers[0];
      if (room.swipes[partnerId] && room.swipes[partnerId].has(movieId)) {
        console.log(`MATCH found in room ${roomId} for movie ${movieId}!`);
        
        // Save to DB
        const userId1 = room.users.get(socket.id);
        const userId2 = room.users.get(partnerId);
        
        // Only save if we haven't saved this match recently (prevent duplicates if multiple fast swipes)
        if (userId1 || userId2) {
          Match.findOneAndUpdate(
            { roomId, movieId },
            {
              roomId,
              movieId,
              movieData,
              userId1: userId1 || undefined,
              userId2: userId2 || undefined
            },
            { upsert: true, new: true }
          ).catch(err => console.error("Error saving match:", err));
        }

        io.to(roomId).emit('match', {
          movieId,
          movieData
        });
      }
    }
  });

  socket.on('swipe_left', ({ roomId, movieId, movieData }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const userId1 = room.users.get(socket.id);
    if (userId1 && movieData) {
      Swipe.findOneAndUpdate(
        { userId: userId1, movieId },
        { movieId, movieData, direction: 'left' },
        { upsert: true, new: true }
      ).catch(err => console.error("Error saving left swipe:", err));
    }
  });

  socket.on('swipe_veto', ({ roomId, movieId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Check if the user has already used their veto
    if (room.vetoes[socket.id]) return;

    // Mark as used
    room.vetoes[socket.id] = true;

    // Broadcast the trap card to the partner
    socket.to(roomId).emit('partner_vetoed_movie', { movieId });
  });
  
  socket.on('send_veto_reaction', ({ roomId }) => {
    // Broadcast revenge reaction back to the partner
    socket.to(roomId).emit('partner_veto_reaction');
  });
  
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        const room = rooms.get(roomId);
        if (room) {
          room.users.delete(socket.id);
          if (room.users.size === 0) {
            rooms.delete(roomId);
          } else {
             io.to(roomId).emit('partner_left');
          }
        }
      }
    }
  });
};
