import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { chatService } from '../services/chatService';
import type { ChatMessage, ScanResult } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatProps {
  scanResult: ScanResult;
}

export default function AIChat({ scanResult }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: new Date().toISOString() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    let assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      await chatService.sendMessage(newHistory, { scanResult }, (chunk, isComplete) => {
        assistantMsg.content += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...assistantMsg };
          return newMsgs;
        });
        if (isComplete) {
          setIsLoading(false);
        }
      });
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I couldn't process your request.", timestamp: new Date().toISOString() };
        return newMsgs;
      });
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all z-50 flex items-center justify-center"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[350px] sm:w-[450px] h-[600px] max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Security Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              title="Clear Conversation"
              className="p-2 text-muted-foreground hover:text-destructive rounded-full hover:bg-secondary transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            <p>I am your Cybersecurity Assistant. I have analyzed the scan for <strong>{scanResult.url}</strong>.</p>
            <p className="mt-2">Ask me anything about the findings!</p>
            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={() => setInput("Summarize the most critical issues and their real-world impact.")}
                className="text-xs p-2 bg-secondary rounded-md hover:bg-secondary/80 text-left transition-colors"
              >
                Summarize the most critical issues and their real-world impact.
              </button>
              <button 
                onClick={() => setInput("Provide a step-by-step remediation plan for the missing security headers.")}
                className="text-xs p-2 bg-secondary rounded-md hover:bg-secondary/80 text-left transition-colors"
              >
                Provide a step-by-step remediation plan for the missing security headers.
              </button>
              <button 
                onClick={() => setInput("How can attackers exploit these specific vulnerabilities?")}
                className="text-xs p-2 bg-secondary rounded-md hover:bg-secondary/80 text-left transition-colors"
              >
                How can attackers exploit these specific vulnerabilities?
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary text-foreground rounded-tl-sm'}`}>
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border prose-a:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || "..."}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-3 max-w-[90%] mr-auto">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-secondary text-foreground">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl text-sm bg-secondary text-foreground rounded-tl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground italic">Analyzing scan results...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about your scan..."
            className="w-full pl-4 pr-12 py-3 bg-secondary/50 border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
