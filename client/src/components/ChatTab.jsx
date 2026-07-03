import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import UserProfileModal from './UserProfileModal';
import useSWR from 'swr';
import styles from './ChatTab.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatTab = () => {
  const { user } = useContext(AuthContext);
  const { clearUnread } = useContext(NotificationContext) || {};
  const fetcher = (url) => axios.get(url).then(res => res.data);
  const postFetcher = (url, body) => axios.post(url, body).then(res => res.data);

  const { data: matches = [] } = useSWR(user ? `${API_URL}/api/user/matches` : null, fetcher);

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const quickEmojis = ['😂', '😍', '😭', '🔥', '👍', '🍿', '🎬', '👻'];

  useEffect(() => {
    if (clearUnread) clearUnread();
  }, [clearUnread]);

  const friends = React.useMemo(() => {
    if (!user) return [];
    const uniqueFriendsMap = new Map();
    matches.forEach(m => {
      let partner = null;
      if (m.userId1 && m.userId1._id !== user._id) partner = m.userId1;
      else if (m.userId2 && m.userId2._id !== user._id) partner = m.userId2;
      
      if (partner && !uniqueFriendsMap.has(partner._id)) {
        const roomId = [user._id, partner._id].sort().join('_');
        uniqueFriendsMap.set(partner._id, { ...partner, chatRoomId: roomId });
      }
    });
    return Array.from(uniqueFriendsMap.values());
  }, [matches, user]);

  const roomIds = React.useMemo(() => friends.map(f => f.chatRoomId), [friends]);
  
  const { data: lastMessages = {} } = useSWR(
    roomIds.length > 0 ? [`${API_URL}/api/chat/last`, JSON.stringify(roomIds)] : null,
    ([url, bodyStr]) => postFetcher(url, { rooms: JSON.parse(bodyStr) })
  );

  useEffect(() => {
    if (!activeChat) return;

    // Connect to specific room
    socketRef.current = io(API_URL);
    socketRef.current.emit('join_direct_chat', { roomId: activeChat.chatRoomId });

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chat?room=${activeChat.chatRoomId}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to fetch chat history', err);
      }
    };
    fetchMessages();

    socketRef.current.on('receive_direct_message', (msg) => {
      if (msg.chatRoomId === activeChat.chatRoomId) {
        setMessages(prev => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    socketRef.current.emit('send_direct_message', {
      userId: user._id,
      username: user.username,
      avatar: user.avatar,
      text: inputText,
      roomId: activeChat.chatRoomId,
      recipientId: activeChat._id
    });

    setInputText('');
  };

  const renderAvatar = (u) => {
    if (u?.avatar?.startsWith('data:image')) {
      return <img src={u.avatar} alt="Avatar" className={styles.avatarImage} />;
    }
    const fallback = u?.avatar === '🦊' ? '👤' : (u?.avatar || '👤');
    return <span className={styles.avatarEmoji}>{fallback}</span>;
  };

  if (!activeChat) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 style={{ textAlign: 'left', width: '100%', fontSize: '24px' }}>Your Chats</h2>
        </div>
        <div className={styles.friendsList}>
          {friends.length === 0 ? (
            <p className={styles.emptyText}>Match with friends to start chatting!</p>
          ) : (
            friends.map(friend => (
              <div 
                key={friend._id} 
                className={styles.friendRow}
                onClick={() => setActiveChat(friend)}
              >
                <div className={styles.friendAvatarWrapper}>
                  {renderAvatar(friend)}
                </div>
                <div className={styles.friendInfo}>
                  <div className={styles.friendNameRow}>
                    <span className={styles.friendName}>{friend.username}</span>
                    {lastMessages[friend.chatRoomId] && (
                      <span className={styles.lastMessageTime}>
                        {new Date(lastMessages[friend.chatRoomId].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {lastMessages[friend.chatRoomId] && (
                    <span className={styles.lastMessageText}>
                      {lastMessages[friend.chatRoomId].text}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.activeHeader}>
        <button className={styles.backBtn} onClick={() => setActiveChat(null)}>←</button>
        <div 
          className={styles.activeAvatarWrapper}
          onClick={() => setShowProfileModal(activeChat._id)}
        >
          {renderAvatar(activeChat)}
        </div>
        <h2 onClick={() => setShowProfileModal(activeChat._id)}>{activeChat.username}</h2>
      </div>

      <div className={styles.chatArea}>
        {messages.map((msg, idx) => {
          const isMe = msg.user._id === user._id || msg.user === user._id;
          return (
            <div key={msg._id || idx} className={`${styles.messageWrapper} ${isMe ? styles.mine : styles.theirs}`}>
              {!isMe && <span className={styles.sender}>{msg.username}</span>}
              <div className={styles.messageBubble}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.emojiRow}>
          {quickEmojis.map(e => (
            <span key={e} onClick={() => setInputText(prev => prev + e)} className={styles.quickEmoji}>
              {e}
            </span>
          ))}
        </div>
        <form onSubmit={handleSend} className={styles.inputArea}>
          <input 
            type="text" 
            placeholder="Message..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.sendBtn} disabled={!inputText.trim()}>
            ➤
          </button>
        </form>
      </div>

      {showProfileModal && (
        <UserProfileModal 
          userId={showProfileModal} 
          onClose={() => setShowProfileModal(null)} 
        />
      )}
    </div>
  );
};

export default ChatTab;
