import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  getDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import type { ChatMessage, UserProgress } from '../types';
import { Send, MessageCircle, ChevronDown } from 'lucide-react';

const season = getCurrentSeason();
const cardMap = new Map(
  (season ? getCardsBySet(season.id) : []).map((c) => [c.id, c])
);

function ChatAvatar({ displayName, avatarCardId }: { displayName: string; avatarCardId?: string }) {
  const card = avatarCardId ? cardMap.get(avatarCardId) : undefined;
  if (card?.image) {
    return (
      <div className="chat-avatar has-image">
        <img src={card.image} alt="" className="profile-avatar-img" />
      </div>
    );
  }
  return (
    <div className="chat-avatar">
      {(displayName || '?')[0].toUpperCase()}
    </div>
  );
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `Hier ${time}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ` ${time}`;
}

interface Props {
  groupId: string;
}

export default function GroupChat({ groupId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [avatarCardId, setAvatarCardId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'userProgress', user.uid)).then((snap) => {
      if (snap.exists()) {
        setAvatarCardId((snap.data() as UserProgress).avatarCardId);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!expanded || !groupId) return;

    const q = query(
      collection(db, 'chatMessages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
        .reverse();
      setMessages(msgs);
    });

    return unsub;
  }, [expanded, groupId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (expanded && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, expanded, scrollToBottom]);

  async function sendMessage() {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'chatMessages'), {
        groupId,
        uid: user.uid,
        displayName: user.displayName || 'Inconnu',
        avatarCardId: avatarCardId || null,
        text: text.trim(),
        createdAt: Date.now(),
      });
      setText('');
    } catch (err) {
      console.error('Erreur envoi message:', err);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <section className="section">
      <button className="members-toggle" onClick={() => setExpanded(!expanded)}>
        <h3><MessageCircle size={16} /> Chat</h3>
        <ChevronDown size={16} className={expanded ? 'rotated' : ''} />
      </button>

      {expanded && (
        <div className="chat-container">
          <div className="chat-body" ref={chatBodyRef}>
            {messages.length === 0 ? (
              <p className="chat-empty">Aucun message. Lance la conversation !</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.uid === user?.uid;
                return (
                  <div key={msg.id} className={`chat-msg ${isMe ? 'me' : ''}`}>
                    {!isMe && (
                      <ChatAvatar displayName={msg.displayName} avatarCardId={msg.avatarCardId} />
                    )}
                    <div className="chat-msg-content">
                      {!isMe && <span className="chat-msg-name">{msg.displayName}</span>}
                      <div className={`chat-bubble ${isMe ? 'mine' : ''}`}>
                        {msg.text}
                      </div>
                      <span className="chat-msg-time">{formatChatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ton message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!text.trim() || sending}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
