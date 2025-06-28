"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import FriendlyHeader from "./FriendlyHeader";
import CasualMessage from "./CasualMessage";
import CasualInput from "./CasualInput";
import ThreadCard from "./ThreadCard";
import { Message, Thread } from "@/types/messages";

const DEMO_MESSAGES: Message[] = [
  {
    id: "1",
    content:
      "Hey there! 👋 I'm Luna, your friendly AI companion. What's on your mind today?",
    role: "assistant",
    created_at: "2024-01-15T10:00:00",
    timestamp: new Date("2024-01-15T10:00:00"),
    isThread: false,
  },
  {
    id: "2",
    content: "Hi Luna! Just trying out this new chat experience 😊",
    role: "user",
    created_at: "2024-01-15T10:01:00",
    timestamp: new Date("2024-01-15T10:01:00"),
    isThread: false,
  },
  {
    id: "3",
    content:
      "Awesome! I love the casual vibe already. This feels so much more natural than formal chat interfaces ✨",
    role: "assistant",
    created_at: "2024-01-15T10:01:30",
    timestamp: new Date("2024-01-15T10:01:30"),
    isThread: false,
  },
];

const DEMO_THREADS: Thread[] = [
  {
    id: "thread-1",
    title: "📚 Math Problem Solving",
    preview: "Helped solve calculus derivatives...",
    messageCount: 8,
    lastActivity: new Date("2024-01-14T15:30:00"),
    isActive: false,
  },
  {
    id: "thread-2",
    title: "🍳 Recipe Planning",
    preview: "Created a weekly meal plan...",
    messageCount: 12,
    lastActivity: new Date("2024-01-13T12:15:00"),
    isActive: false,
  },
];

export default function CasualChatInterface() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [threads] = useState<Thread[]>(DEMO_THREADS);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      isThread: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's really interesting! Tell me more about that 🤔",
        "I love how you think about things! ✨",
        "Hmm, let me think about this for a second... 💭",
        "Oh that reminds me of something cool! 🎯",
        "You always ask the best questions! 😊",
      ];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        role: "assistant",
        created_at: new Date().toISOString(),
        timestamp: new Date(),
        isThread: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <FriendlyHeader
          onToggleThreads={() => setShowThreads(!showThreads)}
          showThreads={showThreads}
          threadCount={threads.length}
        />

        {/* Messages Area */}
        <div className="flex-1 relative">
          <ScrollArea className="h-full px-4 py-2 custom-scrollbar">
            <div className="space-y-4 pb-4 max-w-4xl mx-auto">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.02,
                    }}
                  >
                    <CasualMessage message={message} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-2 px-4 py-3 bg-bg-sidebar rounded-2xl rounded-bl-lg max-w-xs">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-text-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-text-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-text-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary">
                        Luna is typing...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <CasualInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          disabled={isTyping}
        />
      </div>

      {/* Threads Sidebar */}
      <AnimatePresence>
        {showThreads && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-l border-border-primary bg-bg-sidebar overflow-hidden"
          >
            <div className="p-4 border-b border-border-primary">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <span>🧵</span>
                Threads
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Your conversation topics
              </p>
            </div>

            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {threads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}

                {threads.length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🌟</span>
                    <p className="text-sm text-text-secondary">
                      No threads yet!
                      <br />
                      Start a deeper conversation and I&apos;ll create one for
                      you.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
