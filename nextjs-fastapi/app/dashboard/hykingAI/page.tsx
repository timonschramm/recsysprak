'use client';

import { useRef, useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Hike } from '../../components/chatBot/types';
import HikeCard from '../../components/HikeCard';
import Modal from '../../components/Modal';

// Utility function to get or create a unique user ID
const getUserId = () => {
  return `user_${Date.now()}`; // Generates a new ID every time
};


type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  hikes?: Hike[];
};

export default function HykingAIPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'hykingAI',
      text: 'Hi! How can I assist you today?',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [message, setMessage] = useState('');
  const [allHikes, setAllHikes] = useState<Hike[]>([]);
  const [selectedHike, setSelectedHike] = useState<Hike | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const newUserId = getUserId();
  setUserId(newUserId);
}, []);


  useEffect(() => {
    // Set user ID on mount
    const storedUserId = getUserId();
    setUserId(storedUserId);

    const fetchHikes = async () => {
      try {
        const response = await fetch('/api/hikes');
        const data = await response.json();
        setAllHikes(data);
      } catch (error) {
        console.error('Error fetching hikes:', error);
      }
    };

    fetchHikes();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      text: message.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/api/py/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_input: message.trim() }),
      });

      if (!response.ok) throw new Error('Failed to fetch response from backend');

      const data = await response.json();
      const hikes = data.hikes || [];

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'hykingAI',
        text: data.response || 'Here are some hikes you might like:',
        createdAt: new Date().toISOString(),
        hikes: hikes,
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          senderId: 'hykingAI',
          text: 'Something went wrong. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setMessage('');
  };

  // Handle hike click to open a modal
  const handleHikeClick = (hike: Hike) => {
    setSelectedHike(hike);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedHike(null);
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">Hyking AI</h1>
        <p className="text-sm text-gray-500">Your personal hiking assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded-lg text-sm shadow ${msg.senderId === 'user' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {msg.text}
              {msg.hikes && msg.hikes.length > 0 && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {msg.hikes.map((hike) => (
                    <div key={hike.id} className="cursor-pointer" onClick={() => handleHikeClick(hike)}>
                      <HikeCard hike={hike} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Modal for hike details */}
      {isModalOpen && selectedHike && (
        <Modal onClose={closeModal}>
          <HikeCard hike={selectedHike} detailed />
        </Modal>
      )}
    </div>
  );
}
