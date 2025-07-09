"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FriendlyHeader from "./FriendlyHeader";
import CasualMessage from "./CasualMessage";
import CasualInput from "./CasualInput";
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
  {
    id: "thread-3",
    title: "💼 Work Planning",
    preview: "Organizing project timeline...",
    messageCount: 15,
    lastActivity: new Date("2024-01-12T09:30:00"),
    isActive: false,
  },
  {
    id: "thread-4",
    title: "🏃 Fitness Goals",
    preview: "Creating workout routine...",
    messageCount: 6,
    lastActivity: new Date("2024-01-11T18:45:00"),
    isActive: false,
  },
];

interface CasualChatInterfaceProps {
  selectedTool?: string;
}

// Tool content placeholder component
const ToolContent = ({ toolId }: { toolId: string }) => {
  const getToolInfo = (id: string) => {
    const toolMap: Record<
      string,
      { name: string; icon: string; description: string }
    > = {
      todos: {
        name: "Todos",
        icon: "✅",
        description: "Manage your tasks and to-do lists",
      },
      memories: {
        name: "Memories",
        icon: "🧠",
        description: "AI remembers important information for you",
      },
      notes: {
        name: "Notes",
        icon: "📝",
        description: "Quick notes and ideas",
      },
      calendar: {
        name: "Calendar",
        icon: "📅",
        description: "Schedule and events",
      },
      bookmarks: {
        name: "Bookmarks",
        icon: "🔖",
        description: "Saved links and pages",
      },
      documents: {
        name: "Documents",
        icon: "📄",
        description: "Files and documents",
      },
      insights: {
        name: "Insights",
        icon: "📊",
        description: "Analytics and trends",
      },
      search: { name: "Search", icon: "🔍", description: "Find anything" },
      attachments: {
        name: "Files",
        icon: "📎",
        description: "Shared attachments",
      },
      reminders: {
        name: "Reminders",
        icon: "🔔",
        description: "Never forget important things",
      },
      journal: {
        name: "Journal",
        icon: "📖",
        description: "Daily reflections",
      },
      mood: { name: "Mood", icon: "❤️", description: "Track how you feel" },
      settings: {
        name: "Settings",
        icon: "⚙️",
        description: "Customize your experience",
      },
    };
    return (
      toolMap[id] || {
        name: "Unknown Tool",
        icon: "❓",
        description: "Tool description",
      }
    );
  };

  const tool = getToolInfo(toolId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{tool.icon}</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {tool.name}
        </h1>
        <p className="text-text-secondary mb-6">{tool.description}</p>
        <div className="bg-bg-sidebar border border-border-primary rounded-lg p-6">
          <p className="text-sm text-text-secondary">
            This tool is coming soon! We&apos;re working hard to bring you
            amazing features.
          </p>
        </div>
      </div>
    </div>
  );
};

// Threads content component
const ThreadsContent = () => {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Threads Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_THREADS.map((thread) => (
              <motion.div
                key={thread.id}
                className="p-4 rounded-lg bg-bg-input border border-border-primary hover:bg-bg-input/80 hover:border-text-secondary cursor-pointer transition-all duration-200"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* Thread Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-text-primary text-sm line-clamp-2">
                    {thread.title}
                  </h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-bg-sidebar text-text-secondary flex-shrink-0 ml-2">
                    {thread.messageCount}
                  </span>
                </div>

                {/* Thread Preview */}
                <p className="text-sm text-text-secondary mb-3 line-clamp-3">
                  {thread.preview}
                </p>

                {/* Thread Footer */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{thread.messageCount} messages</span>
                  <span>{thread.lastActivity.toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state if no threads */}
          {DEMO_THREADS.length === 0 && (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">🌟</span>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No threads yet!
              </h3>
              <p className="text-text-secondary">
                Start a deeper conversation with Luna and threads will appear
                here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CasualChatInterface({
  selectedTool = "luna",
}: CasualChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  // Show threads content
  if (selectedTool === "threads") {
    return <ThreadsContent />;
  }

  // Show other tool content
  if (selectedTool !== "luna") {
    return <ToolContent toolId={selectedTool} />;
  }

  // Show Luna chat (default)
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 py-2 custom-scrollbar">
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
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0">
        <CasualInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          disabled={isTyping}
        />
      </div>
    </div>
  );
}
