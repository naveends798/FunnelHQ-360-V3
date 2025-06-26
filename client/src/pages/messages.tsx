import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { type Client, type User } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { 
  Search, 
  MessageCircle, 
  Send,
  ArrowLeft,
  FolderOpen,
  Calendar,
  Clock,
  Users,
  Paperclip,
  Mic,
  CornerDownLeft,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatInput } from "@/components/ui/chat-input";

interface Message {
  id: number;
  projectId: number;
  senderId: number;
  senderType: 'client' | 'team_member';
  content: string;
  sentAt: Date;
  isRead: boolean;
  sender: {
    id: number;
    name: string;
    email?: string;
  };
}

interface Conversation {
  projectId: number;
  projectName: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: Array<{
    id: number;
    name: string;
    type: 'client' | 'team_member';
  }>;
}

interface DirectMessage {
  id: number;
  clientId: number;
  senderId: number;
  senderType: 'admin' | 'client';
  content: string;
  sentAt: Date;
  isRead: boolean;
  sender: {
    id: number;
    name: string;
    email?: string;
  };
}

interface ClientConversation {
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientAvatar?: string;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

interface TeamMemberConversation {
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

export default function MessagesPage() {
  const { authUser, currentRole, isClient, isAdmin } = useAuth();
  const isTeamMember = currentRole === 'team_member';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  
  // Admin-only client messaging state
  const [clientConversations, setClientConversations] = useState<ClientConversation[]>([]);
  const [selectedClientConversation, setSelectedClientConversation] = useState<ClientConversation | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [activeTab, setActiveTab] = useState<string>("team");
  
  // Admin-only team member messaging state
  const [teamMemberConversations, setTeamMemberConversations] = useState<TeamMemberConversation[]>([]);
  const [selectedTeamMemberConversation, setSelectedTeamMemberConversation] = useState<TeamMemberConversation | null>(null);
  const [teamDirectMessages, setTeamDirectMessages] = useState<DirectMessage[]>([]);
  
  // Client conversation threads
  const [clientThreads, setClientThreads] = useState<Array<{
    id: string;
    title: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    createdAt: Date;
  }>>([]);
  const [selectedClientThread, setSelectedClientThread] = useState<string | null>(null);
  const [clientThreadMessages, setClientThreadMessages] = useState<DirectMessage[]>([]);
  
  // Team member conversation threads (for admins/team members)
  const [teamThreads, setTeamThreads] = useState<Array<{
    id: string;
    title: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    createdAt: Date;
    targetUserId: number;
    targetUserName: string;
  }>>([]);
  const [selectedTeamThread, setSelectedTeamThread] = useState<string | null>(null);
  const [teamThreadMessages, setTeamThreadMessages] = useState<DirectMessage[]>([]);
  
  // Client thread management for admins
  const [adminClientThreads, setAdminClientThreads] = useState<Array<{
    id: string;
    title: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    createdAt: Date;
    clientId: number;
    clientName: string;
  }>>([]);
  const [selectedAdminClientThread, setSelectedAdminClientThread] = useState<string | null>(null);
  const [adminClientThreadMessages, setAdminClientThreadMessages] = useState<DirectMessage[]>([]);
  
  // Fetch clients for admin messaging
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAdmin
  });

  // Fetch team members for admin messaging (admins can see all, team members can see only admins)
  const { data: teamMembers, isLoading: teamMembersLoading, error: teamMembersError } = useQuery<User[]>({
    queryKey: ["/api/team/members", { organizationId: 1 }],
    enabled: isAdmin || isTeamMember,
    queryFn: async () => {
      const response = await fetch('/api/team/members?organizationId=1');
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      console.log('📋 Fetched team members from API:', data);
      return data;
    }
  });

  // Get current user info from auth context  
  const currentUserId = authUser?.id || 1;
  const currentUserType = isClient ? 'client' : 'team_member';

  // WebSocket for real-time messaging
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'message:new' && message.data) {
      const { projectId, message: newMessage } = message.data;
      
      // Update messages if current conversation is open
      if (selectedConversation?.projectId === projectId) {
        setMessages(prev => [...prev, newMessage]);
      }
      
      // Update conversation list with new last message
      setConversations(prev =>
        prev.map(conv =>
          conv.projectId === projectId
            ? { ...conv, lastMessage: newMessage, unreadCount: conv.unreadCount + 1 }
            : conv
        )
      );
    }
  }, [selectedConversation]);

  const { sendMessage: sendWebSocketMessage } = useWebSocket({
    userId: currentUserId,
    onMessage: handleWebSocketMessage,
    onConnect: () => console.log('Connected to messaging WebSocket'),
    onDisconnect: () => console.log('Disconnected from messaging WebSocket')
  });

  useEffect(() => {
    fetchConversations();
    if (isAdmin) {
      fetchClientConversations();
      fetchTeamMemberConversations();
    } else if (isTeamMember) {
      // Team members can only access admin messaging
      fetchTeamMemberConversations();
    } else if (isClient) {
      // Initialize with empty thread list for clients
      setClientThreads([]);
    }
  }, [isAdmin, isTeamMember, isClient, currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.projectId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedClientConversation) {
      fetchDirectMessages(selectedClientConversation.clientId);
    }
  }, [selectedClientConversation]);

  useEffect(() => {
    if (selectedTeamMemberConversation) {
      fetchTeamDirectMessages(selectedTeamMemberConversation.userId);
    }
  }, [selectedTeamMemberConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/messages/conversations?userId=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientConversations = async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch('/api/messages/client-conversations');
      if (response.ok) {
        const data = await response.json();
        setClientConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch client conversations:", error);
    }
  };

  const fetchTeamMemberConversations = async () => {
    if (!isAdmin && !isTeamMember) return;
    try {
      const response = await fetch('/api/messages/team-conversations');
      if (response.ok) {
        const data = await response.json();
        setTeamMemberConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch team member conversations:", error);
    }
  };

  const fetchDirectMessages = async (clientId: number) => {
    try {
      const response = await fetch(`/api/messages/direct/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setDirectMessages(data);
        
        // Mark messages as read
        await markDirectMessagesAsRead(clientId);
      }
    } catch (error) {
      console.error("Failed to fetch direct messages:", error);
    }
  };

  const markDirectMessagesAsRead = async (clientId: number) => {
    try {
      await fetch(`/api/messages/direct/${clientId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      
      // Update client conversation unread count
      setClientConversations(prev => 
        prev.map(conv => 
          conv.clientId === clientId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark direct messages as read:", error);
    }
  };

  const fetchTeamDirectMessages = async (userId: number) => {
    try {
      const response = await fetch(`/api/messages/team-direct/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamDirectMessages(data);
        
        // Mark messages as read
        await markTeamDirectMessagesAsRead(userId);
      }
    } catch (error) {
      console.error("Failed to fetch team direct messages:", error);
    }
  };

  const markTeamDirectMessagesAsRead = async (userId: number) => {
    try {
      await fetch(`/api/messages/team-direct/${userId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      
      // Update team member conversation unread count
      setTeamMemberConversations(prev => 
        prev.map(conv => 
          conv.userId === userId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark team direct messages as read:", error);
    }
  };

  const fetchMessages = async (projectId: number) => {
    try {
      const response = await fetch(`/api/messages/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Mark messages as read
        await markMessagesAsRead(projectId);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const markMessagesAsRead = async (projectId: number) => {
    try {
      await fetch(`/api/messages/project/${projectId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      
      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.projectId === projectId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedConversation.projectId,
          senderId: currentUserId,
          senderType: currentUserType,
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, {
          ...message,
          sender: { id: currentUserId, name: "You" }
        }]);
        setNewMessage("");
        
        // Update conversation with latest message
        setConversations(prev =>
          prev.map(conv =>
            conv.projectId === selectedConversation.projectId
              ? { ...conv, lastMessage: message }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!selectedClientConversation || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientConversation.clientId,
          senderId: currentUserId,
          senderType: 'admin',
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        const message = await response.json();
        setDirectMessages(prev => [...prev, {
          ...message,
          sender: { id: currentUserId, name: "You" }
        }]);
        setNewMessage("");
        
        // Update client conversation with latest message
        setClientConversations(prev =>
          prev.map(conv =>
            conv.clientId === selectedClientConversation.clientId
              ? { ...conv, lastMessage: message }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Failed to send direct message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendTeamDirectMessage = async () => {
    if (!selectedTeamMemberConversation || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages/team-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedTeamMemberConversation.userId,
          senderId: currentUserId,
          senderType: isAdmin ? 'admin' : 'team_member',
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        const message = await response.json();
        setTeamDirectMessages(prev => [...prev, {
          ...message,
          sender: { id: currentUserId, name: "You" }
        }]);
        setNewMessage("");
        
        // Update team member conversation with latest message
        setTeamMemberConversations(prev =>
          prev.map(conv =>
            conv.userId === selectedTeamMemberConversation.userId
              ? { ...conv, lastMessage: message }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Failed to send team direct message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredClientConversations = clientConversations.filter(conv =>
    conv.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    conv.clientEmail.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const filteredTeamMemberConversations = teamMemberConversations.filter(conv =>
    conv.userName.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    conv.userEmail.toLowerCase().includes(teamSearchTerm.toLowerCase())
  );

  // Initialize client conversations from clients data
  useEffect(() => {
    if (isAdmin && clients) {
      const newClientConversations: ClientConversation[] = clients.map(client => ({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientAvatar: client.avatar,
        lastMessage: undefined,
        unreadCount: 0
      }));
      setClientConversations(newClientConversations);
    }
  }, [isAdmin, clients]);

  // Initialize team member conversations from users data
  useEffect(() => {
    console.log('🔍 Team members effect triggered:', { 
      isAdmin, 
      isTeamMember, 
      teamMembersLoading, 
      teamMembersError, 
      teamMembersCount: teamMembers?.length || 0,
      currentUserId 
    });
    
    if (teamMembersError) {
      console.error('❌ Error fetching team members:', teamMembersError);
    }
    
    if ((isAdmin || isTeamMember) && teamMembers) {
      console.log('👥 Available team members:', teamMembers);
      
      let filteredTeamMembers: User[];
      
      if (isAdmin) {
        // Admins can see all active users (excluding themselves and clients)
        filteredTeamMembers = teamMembers.filter(member => 
          member.id !== currentUserId && 
          (member.status === 'active' || !member.status) && // Include users without status field for backward compatibility
          member.role !== 'client' // Exclude clients from team member conversations
        );
      } else if (isTeamMember) {
        // Team members can ONLY message admins (not other team members)
        filteredTeamMembers = teamMembers.filter(member => 
          member.id !== currentUserId && 
          (member.status === 'active' || !member.status) && // Include users without status field for backward compatibility
          member.role === 'admin' // Team members can ONLY message admins
        );
      } else {
        filteredTeamMembers = [];
      }
      
      console.log('Filtered team members for messaging:', filteredTeamMembers);
      
      const newTeamMemberConversations: TeamMemberConversation[] = filteredTeamMembers.map(member => ({
        userId: member.id,
        userName: member.name,
        userEmail: member.email,
        userAvatar: member.avatar,
        lastMessage: undefined,
        unreadCount: 0
      }));
      setTeamMemberConversations(newTeamMemberConversations);
    }
  }, [isAdmin, isTeamMember, teamMembers, teamMembersLoading, teamMembersError, currentUserId]);

  const formatDate = (date: Date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
    }
  };

  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Function to generate conversation title from message content
  const generateConversationTitle = (message: string) => {
    // Remove extra whitespace and limit to first 50 characters
    const cleanMessage = message.trim();
    if (cleanMessage.length <= 50) {
      return cleanMessage;
    }
    
    // Try to break at word boundary near 50 characters
    const truncated = cleanMessage.substring(0, 50);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 30) { // Ensure we don't cut too short
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  };

  // Client thread functions
  const createNewClientThread = () => {
    const newThread = {
      id: `thread_${Date.now()}`,
      title: "New Conversation", // Start with generic title, will update when first message is sent
      lastMessage: undefined,
      lastMessageTime: undefined,
      unreadCount: 0,
      createdAt: new Date()
    };
    setClientThreads(prev => [newThread, ...prev]);
    setSelectedClientThread(newThread.id);
    setClientThreadMessages([]);
    setSelectedClientConversation(null);
  };

  const fetchClientThreadMessages = async (threadId: string) => {
    try {
      // For now, use local state - in real app, fetch from API
      // const response = await fetch(`/api/client-threads/${threadId}/messages`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setClientThreadMessages(data);
      // }
      setClientThreadMessages([]);
    } catch (error) {
      console.error("Failed to fetch thread messages:", error);
    }
  };

  const handleSendClientThreadMessage = async () => {
    if (!selectedClientThread || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // For demo purposes, create a mock message
      const mockMessage: DirectMessage = {
        id: Date.now(),
        clientId: currentUserId,
        senderId: currentUserId,
        senderType: 'client',
        content: newMessage.trim(),
        sentAt: new Date(),
        isRead: false,
        sender: { id: currentUserId, name: "You" }
      };

      setClientThreadMessages(prev => [...prev, mockMessage]);
      
      // Update thread with latest message and title (if it's the first message)
      setClientThreads(prev => 
        prev.map(thread => {
          if (thread.id === selectedClientThread) {
            const isFirstMessage = !thread.lastMessage && thread.title === "New Conversation";
            return {
              ...thread, 
              title: isFirstMessage ? generateConversationTitle(newMessage.trim()) : thread.title,
              lastMessage: newMessage.trim(),
              lastMessageTime: new Date()
            };
          }
          return thread;
        })
      );
      
      setNewMessage("");

      // In real app, send to API:
      // const response = await fetch('/api/client-threads/messages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     threadId: selectedClientThread,
      //     senderId: currentUserId,
      //     senderType: 'client',
      //     content: newMessage.trim()
      //   })
      // });
    } catch (error) {
      console.error("Failed to send thread message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Team thread functions
  const createNewTeamThread = (targetUserId: number, targetUserName: string) => {
    const newThread = {
      id: `team_thread_${Date.now()}`,
      title: "New Conversation", // Will update with first message content
      lastMessage: undefined,
      lastMessageTime: undefined,
      unreadCount: 0,
      createdAt: new Date(),
      targetUserId,
      targetUserName
    };
    setTeamThreads(prev => [newThread, ...prev]);
    setSelectedTeamThread(newThread.id);
    setTeamThreadMessages([]);
    setSelectedTeamMemberConversation(null);
  };

  // Admin client thread functions
  const createNewAdminClientThread = (clientId: number, clientName: string) => {
    const newThread = {
      id: `admin_client_thread_${Date.now()}`,
      title: "New Conversation", // Will update with first message content
      lastMessage: undefined,
      lastMessageTime: undefined,
      unreadCount: 0,
      createdAt: new Date(),
      clientId,
      clientName
    };
    setAdminClientThreads(prev => [newThread, ...prev]);
    setSelectedAdminClientThread(newThread.id);
    setAdminClientThreadMessages([]);
    setSelectedClientConversation(null);
  };

  // Team thread message sending
  const handleSendTeamThreadMessage = async () => {
    if (!selectedTeamThread || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // For demo purposes, create a mock message
      const mockMessage: DirectMessage = {
        id: Date.now(),
        clientId: currentUserId,
        senderId: currentUserId,
        senderType: 'admin',
        content: newMessage.trim(),
        sentAt: new Date(),
        isRead: false,
        sender: { id: currentUserId, name: "You" }
      };

      setTeamThreadMessages(prev => [...prev, mockMessage]);
      
      // Update thread with latest message and title (if it's the first message)
      setTeamThreads(prev => 
        prev.map(thread => {
          if (thread.id === selectedTeamThread) {
            const isFirstMessage = !thread.lastMessage && thread.title === "New Conversation";
            return {
              ...thread, 
              title: isFirstMessage ? generateConversationTitle(newMessage.trim()) : thread.title,
              lastMessage: newMessage.trim(),
              lastMessageTime: new Date()
            };
          }
          return thread;
        })
      );
      
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send team thread message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Admin client thread message sending
  const handleSendAdminClientThreadMessage = async () => {
    if (!selectedAdminClientThread || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // For demo purposes, create a mock message
      const mockMessage: DirectMessage = {
        id: Date.now(),
        clientId: currentUserId,
        senderId: currentUserId,
        senderType: 'admin',
        content: newMessage.trim(),
        sentAt: new Date(),
        isRead: false,
        sender: { id: currentUserId, name: "You" }
      };

      setAdminClientThreadMessages(prev => [...prev, mockMessage]);
      
      // Update thread with latest message and title (if it's the first message)
      setAdminClientThreads(prev => 
        prev.map(thread => {
          if (thread.id === selectedAdminClientThread) {
            const isFirstMessage = !thread.lastMessage && thread.title === "New Conversation";
            return {
              ...thread, 
              title: isFirstMessage ? generateConversationTitle(newMessage.trim()) : thread.title,
              lastMessage: newMessage.trim(),
              lastMessageTime: new Date()
            };
          }
          return thread;
        })
      );
      
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send admin client thread message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Messages
              </h1>
              <p className="text-slate-400 mt-2">
                Communicate with your team and clients
              </p>
            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className={`space-y-3 ${(selectedConversation || selectedClientConversation || selectedTeamMemberConversation) ? 'hidden lg:block' : ''}`}>
          {/* Tabs for switching between project and client messages */}
          {isAdmin && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="team">Team Members</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
              </TabsList>
              <TabsContent value="team" className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search team members..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* New Conversation Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Start New Conversation</h4>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers && teamMembers
                      .filter(member => {
                        const matchesSearch = teamSearchTerm === "" || 
                          member.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                          member.email.toLowerCase().includes(teamSearchTerm.toLowerCase());
                        return member.id !== currentUserId && 
                               (member.status === 'active' || !member.status) && 
                               member.role !== 'client' &&
                               matchesSearch;
                      })
                      .map(member => (
                        <Button
                          key={member.id}
                          size="sm"
                          variant="outline"
                          className="glass border-white/20 text-white hover:bg-white/10"
                          onClick={() => createNewTeamThread(member.id, member.name)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {member.name}
                        </Button>
                      ))
                    }
                  </div>
                </div>

                {/* Active Team Conversations */}
                <div className="space-y-1 overflow-y-auto">
                  {teamThreads.filter(thread => 
                    teamSearchTerm === "" || 
                    thread.title.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                    thread.targetUserName.toLowerCase().includes(teamSearchTerm.toLowerCase())
                  ).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-8 w-8 text-slate-400 mb-2 mx-auto" />
                      <p className="text-slate-400 text-sm">
                        {teamSearchTerm ? "No conversations match your search" : "No active conversations"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Start a new conversation above</p>
                    </div>
                  ) : (
                    teamThreads
                      .filter(thread => 
                        teamSearchTerm === "" || 
                        thread.title.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                        thread.targetUserName.toLowerCase().includes(teamSearchTerm.toLowerCase())
                      )
                      .map((thread) => (
                      <motion.div
                        key={thread.id}
                        whileHover={{ x: 2 }}
                        className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          selectedTeamThread === thread.id 
                            ? 'bg-primary/10 border-l-2 border-primary' 
                            : 'hover:bg-white/5'
                        }`}
                        onClick={() => {
                          setSelectedTeamThread(thread.id);
                          setSelectedConversation(null);
                          setSelectedClientConversation(null);
                          setSelectedTeamMemberConversation(null);
                          setSelectedClientThread(null);
                          setSelectedAdminClientThread(null);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {thread.targetUserName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-white truncate text-sm">{thread.title}</h3>
                              {thread.unreadCount > 0 && (
                                <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  {thread.unreadCount}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-blue-400 mb-1 truncate">
                              Team Chat
                            </p>
                            {thread.lastMessage ? (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-300 truncate flex-1 mr-2">
                                  {thread.lastMessage}
                                </p>
                                <span className="text-xs text-slate-500 flex-shrink-0">
                                  {thread.lastMessageTime && formatDate(thread.lastMessageTime)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">
                                Start the conversation...
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              {/* Client Conversations Tab */}
              <TabsContent value="clients" className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search clients..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* New Client Conversation Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Start New Client Conversation</h4>
                  <div className="flex flex-wrap gap-2">
                    {clients && clients
                      .filter(client => {
                        const matchesSearch = clientSearchTerm === "" || 
                          client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                          client.email.toLowerCase().includes(clientSearchTerm.toLowerCase());
                        return client.id !== currentUserId && matchesSearch;
                      })
                      .map(client => (
                        <Button
                          key={client.id}
                          size="sm"
                          variant="outline"
                          className="glass border-white/20 text-white hover:bg-white/10"
                          onClick={() => createNewAdminClientThread(client.id, client.name)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {client.name}
                        </Button>
                      ))
                    }
                  </div>
                </div>
                
                {/* Active Client Conversations */}
                <div className="space-y-1 overflow-y-auto">
                  {adminClientThreads.filter(thread => 
                    clientSearchTerm === "" || 
                    thread.title.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    thread.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
                  ).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-8 w-8 text-slate-400 mb-2 mx-auto" />
                      <p className="text-slate-400 text-sm">
                        {clientSearchTerm ? "No conversations match your search" : "No active client conversations"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Start a new conversation above</p>
                    </div>
                  ) : (
                    adminClientThreads
                      .filter(thread => 
                        clientSearchTerm === "" || 
                        thread.title.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        thread.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
                      )
                      .map((thread) => (
                        <motion.div
                          key={thread.id}
                          whileHover={{ x: 2 }}
                          className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            selectedAdminClientThread === thread.id 
                              ? 'bg-primary/10 border-l-2 border-primary' 
                              : 'hover:bg-white/5'
                          }`}
                          onClick={() => {
                            setSelectedAdminClientThread(thread.id);
                            setSelectedConversation(null);
                            setSelectedClientConversation(null);
                            setSelectedTeamMemberConversation(null);
                            setSelectedClientThread(null);
                            setSelectedTeamThread(null);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {thread.clientName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-white truncate text-sm">{thread.title}</h3>
                                {thread.unreadCount > 0 && (
                                  <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {thread.unreadCount}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-green-400 mb-1 truncate">
                                Client: {thread.clientName}
                              </p>
                              {thread.lastMessage ? (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-slate-300 truncate flex-1 mr-2">
                                    {thread.lastMessage}
                                  </p>
                                  <span className="text-xs text-slate-500 flex-shrink-0">
                                    {thread.lastMessageTime && formatDate(thread.lastMessageTime)}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">
                                  Start the conversation...
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          {/* Team members see only admin messaging */}
          {isTeamMember && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Team Member Conversations (Only Admins) */}
              <div className="space-y-1 overflow-y-auto">
                {filteredTeamMemberConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-400 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-white mb-2">No admins available</h3>
                    <p className="text-slate-400 text-center max-w-sm mx-auto">
                      You can message admins here when they're available.
                    </p>
                  </div>
                ) : (
                  filteredTeamMemberConversations.map((teamMemberConv) => (
                    <motion.div
                      key={teamMemberConv.userId}
                      whileHover={{ x: 2 }}
                      className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                        selectedTeamMemberConversation?.userId === teamMemberConv.userId 
                          ? 'bg-primary/10 border-l-2 border-primary' 
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setSelectedTeamMemberConversation(teamMemberConv);
                        setSelectedConversation(null);
                        setSelectedClientConversation(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {teamMemberConv.userAvatar ? (
                            <img
                              src={teamMemberConv.userAvatar}
                              alt={teamMemberConv.userName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {teamMemberConv.userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-white truncate text-sm">{teamMemberConv.userName}</h3>
                            {teamMemberConv.unreadCount > 0 && (
                              <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {teamMemberConv.unreadCount}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-red-400 mb-1 truncate">
                            Admin • {teamMemberConv.userEmail}
                          </p>
                          {teamMemberConv.lastMessage && (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-300 truncate flex-1 mr-2">
                                {teamMemberConv.lastMessage.content}
                              </p>
                              <span className="text-xs text-slate-500 flex-shrink-0">
                                {formatDate(teamMemberConv.lastMessage.sentAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
          
          {/* Client users see threaded conversations */}
          {!isAdmin && !isTeamMember && (
            <>
              {/* New Conversation Button */}
              <div className="mb-4">
                <Button 
                  onClick={createNewClientThread}
                  className="w-full gradient-primary text-white font-medium hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Conversation
                </Button>
              </div>

              {/* Client Conversation Threads */}
              <div className="space-y-1 overflow-y-auto">
                {clientThreads.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-slate-400 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-white mb-2">No conversations yet</h3>
                    <p className="text-slate-400 text-center max-w-sm mx-auto">
                      Start a new conversation for support
                    </p>
                  </div>
                ) : (
                  clientThreads.map((thread) => (
                    <motion.div
                      key={thread.id}
                      whileHover={{ x: 2 }}
                      className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                        selectedClientThread === thread.id 
                          ? 'bg-primary/10 border-l-2 border-primary' 
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setSelectedClientThread(thread.id);
                        setSelectedClientConversation(null);
                        setSelectedConversation(null);
                        setSelectedTeamMemberConversation(null);
                        fetchClientThreadMessages(thread.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-white truncate text-sm">{thread.title}</h3>
                            {thread.unreadCount > 0 && (
                              <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {thread.unreadCount}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mb-1 truncate">
                            Support Chat
                          </p>
                          {thread.lastMessage ? (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-300 truncate flex-1 mr-2">
                                {thread.lastMessage}
                              </p>
                              <span className="text-xs text-slate-500 flex-shrink-0">
                                {thread.lastMessageTime && formatDate(thread.lastMessageTime)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Start the conversation...
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages View */}
        {selectedConversation ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white">{selectedConversation.projectName}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedConversation.participants.map(p => p.name).join(", ")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedTeamMemberConversation ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedTeamMemberConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    {selectedTeamMemberConversation.userAvatar ? (
                      <img
                        src={selectedTeamMemberConversation.userAvatar}
                        alt={selectedTeamMemberConversation.userName}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center ring-1 ring-white/20">
                        <span className="text-white font-semibold text-sm">
                          {selectedTeamMemberConversation.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg text-white">{selectedTeamMemberConversation.userName}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {selectedTeamMemberConversation.userEmail}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {teamDirectMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      teamDirectMessages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : selectedTeamMemberConversation?.userAvatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendTeamDirectMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedClientConversation ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedClientConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    {selectedClientConversation.clientAvatar ? (
                      <img
                        src={selectedClientConversation.clientAvatar}
                        alt={selectedClientConversation.clientName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {selectedClientConversation.clientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg text-white">{selectedClientConversation.clientName}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {selectedClientConversation.clientEmail}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {directMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>{isClient ? "Start a conversation with your admin!" : "No messages yet. Start the conversation!"}</p>
                        {isClient && (
                          <p className="text-xs text-slate-500 mt-1 text-center">
                            Ask about project status, timeline updates, or any questions
                          </p>
                        )}
                      </div>
                    ) : (
                      directMessages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : selectedClientConversation?.clientAvatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendDirectMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isClient ? "Ask about your project status, updates, or any questions..." : "Type your message..."}
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedClientThread ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedClientThread(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center ring-1 ring-white/20">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {clientThreads.find(t => t.id === selectedClientThread)?.title || "Conversation"}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Support Chat
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {clientThreadMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>Start your support conversation!</p>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                          Ask about project status, timeline updates, or any questions
                        </p>
                      </div>
                    ) : (
                      clientThreadMessages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendClientThreadMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask about your project status, updates, or any questions..."
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedTeamThread ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedTeamThread(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center ring-1 ring-white/20">
                      <span className="text-white font-medium text-sm">
                        {teamThreads.find(t => t.id === selectedTeamThread)?.targetUserName.charAt(0).toUpperCase() || 'T'}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {teamThreads.find(t => t.id === selectedTeamThread)?.title || "Team Conversation"}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Team Chat with {teamThreads.find(t => t.id === selectedTeamThread)?.targetUserName}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {teamThreadMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>Start your team conversation!</p>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                          Collaborate with your team member
                        </p>
                      </div>
                    ) : (
                      teamThreadMessages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendTeamThreadMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message your team member..."
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedAdminClientThread ? (
          <div className="lg:col-span-2 flex flex-col">
            <Card className="glass border-white/10 flex-1 flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedAdminClientThread(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center ring-1 ring-white/20">
                      <span className="text-white font-medium text-sm">
                        {adminClientThreads.find(t => t.id === selectedAdminClientThread)?.clientName.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {adminClientThreads.find(t => t.id === selectedAdminClientThread)?.title || "Client Conversation"}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Client Chat with {adminClientThreads.find(t => t.id === selectedAdminClientThread)?.clientName}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-hidden">
                  <ChatMessageList className="h-[400px]">
                    {adminClientThreadMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <MessageCircle className="h-8 w-8 mb-2" />
                        <p>Start your client conversation!</p>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                          Send updates and support to your client
                        </p>
                      </div>
                    ) : (
                      adminClientThreadMessages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.senderId === currentUserId ? "sent" : "received"}
                        >
                          <ChatBubbleAvatar
                            className="h-8 w-8 shrink-0"
                            src={message.senderId === currentUserId 
                              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop" 
                              : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                            }
                            fallback={message.sender.name?.charAt(0) || 'U'}
                          />
                          <ChatBubbleMessage
                            variant={message.senderId === currentUserId ? "sent" : "received"}
                          >
                            <div className="mb-1">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70">
                              {message.sender.name} • {formatMessageTime(message.sentAt)}
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))
                    )}
                    {sendingMessage && (
                      <ChatBubble variant="sent">
                        <ChatBubbleAvatar
                          className="h-8 w-8 shrink-0"
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                          fallback="U"
                        />
                        <ChatBubbleMessage isLoading />
                      </ChatBubble>
                    )}
                  </ChatMessageList>
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-white/10">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAdminClientThreadMessage();
                    }}
                    className="relative rounded-lg border border-white/20 bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                  >
                    <ChatInput
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Send updates or support to your client..."
                      className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0 justify-between">
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Paperclip className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => {}}
                        >
                          <Mic className="size-4" />
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="ml-auto gap-1.5"
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        Send Message
                        <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2 hidden lg:flex">
            <Card className="glass border-white/10 flex-1">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <MessageCircle className="h-16 w-16 text-slate-400 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Select a conversation</h3>
                <p className="text-slate-400 text-center max-w-sm">
                  {isAdmin 
                    ? "Choose a project conversation or client to start messaging."
                    : isClient
                    ? "Click on Admin Support to start messaging your account admin."
                    : "Choose a project conversation from the list to start messaging."
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
}