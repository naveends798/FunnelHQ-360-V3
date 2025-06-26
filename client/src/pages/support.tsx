import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Bug,
  Lightbulb,
  CreditCard,
  HelpCircle,
  User,
  Calendar,
  Tag,
  Send,
  Paperclip,
  ArrowLeft,
  TrendingUp,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { type TicketWithMessages } from "@shared/schema";

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketWithMessages[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "support",
    priority: "medium"
  });
  const [newMessage, setNewMessage] = useState("");

  // Mock organization and user ID - in real app, get from auth context
  const organizationId = 1;
  const currentUserId = 1;

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter]);

  const fetchTickets = async () => {
    try {
      let url = `/api/support/tickets/${organizationId}`;
      const params = new URLSearchParams();
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTicket,
          organizationId,
          userId: currentUserId
        })
      });

      if (response.ok) {
        const ticket = await response.json();
        setTickets(prev => [ticket, ...prev]);
        setIsCreateDialogOpen(false);
        setNewTicket({
          title: "",
          description: "",
          category: "support",
          priority: "medium"
        });
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          senderType: "user",
          content: newMessage,
          isInternal: false
        })
      });

      if (response.ok) {
        const message = await response.json();
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...prev.messages, { ...message, sender: { id: currentUserId, name: "You" } }]
        } : null);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedTicket = await response.json();
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updatedTicket } : t));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, ...updatedTicket } : null);
        }
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed": return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "bug": return <Bug className="h-4 w-4 text-red-500" />;
      case "feature": return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case "billing": return <CreditCard className="h-4 w-4 text-green-500" />;
      case "support": return <HelpCircle className="h-4 w-4 text-purple-500" />;
      default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
            <HelpCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Support Center
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Get expert help when you need it. Track your requests and get timely responses from our support team.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Open Tickets</h3>
              <p className="text-2xl font-bold text-red-600">{tickets.filter(t => t.status === 'open').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">In Progress</h3>
              <p className="text-2xl font-bold text-yellow-600">{tickets.filter(t => t.status === 'in_progress').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Resolved</h3>
              <p className="text-2xl font-bold text-green-600">{tickets.filter(t => t.status === 'resolved').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Total Tickets</h3>
              <p className="text-2xl font-bold text-blue-600">{tickets.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search your tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-12 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">🔴 Open</SelectItem>
                <SelectItem value="in_progress">🟡 In Progress</SelectItem>
                <SelectItem value="resolved">🟢 Resolved</SelectItem>
                <SelectItem value="closed">⚫ Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-12 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bug">🐛 Bug Reports</SelectItem>
                <SelectItem value="feature">💡 Feature Requests</SelectItem>
                <SelectItem value="billing">💳 Billing Issues</SelectItem>
                <SelectItem value="support">❓ General Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
                <Plus className="h-5 w-5 mr-2" />
                Create New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">Create Support Ticket</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Describe your issue in detail and we'll help you resolve it quickly. Our support team typically responds within 2-4 hours.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Issue Title *</Label>
                  <Input
                    id="title"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief, clear description of your issue"
                    className="mt-2 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700">Category *</Label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="mt-2 h-12 rounded-xl border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">🐛 Bug Report</SelectItem>
                        <SelectItem value="feature">💡 Feature Request</SelectItem>
                        <SelectItem value="billing">💳 Billing Issue</SelectItem>
                        <SelectItem value="support">❓ General Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority" className="text-sm font-semibold text-gray-700">Priority *</Label>
                    <Select value={newTicket.priority} onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger className="mt-2 h-12 rounded-xl border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low - General inquiry</SelectItem>
                        <SelectItem value="medium">🟡 Medium - Standard issue</SelectItem>
                        <SelectItem value="high">🟠 High - Important issue</SelectItem>
                        <SelectItem value="urgent">🔴 Urgent - Critical issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description *</Label>
                  <Textarea
                    id="description"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Please provide detailed information about your issue, including:
• What you were trying to do
• What actually happened  
• Any error messages
• Steps to reproduce (if applicable)"
                    rows={6}
                    className="mt-2 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">Be as specific as possible to help us resolve your issue quickly.</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-12 rounded-xl">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTicket} 
                    className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg"
                    disabled={!newTicket.title || !newTicket.description}
                  >
                    Create Ticket
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tickets Content */}
        {selectedTicket ? (
          /* Ticket Detail View */
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      {getCategoryIcon(selectedTicket.category)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                      <p className="text-sm text-gray-500">Ticket #{selectedTicket.id}</p>
                    </div>
                    <Badge className={`${getPriorityColor(selectedTicket.priority)} px-3 py-1 text-xs font-semibold border`}>
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-gray-700 bg-white rounded-lg p-4 shadow-sm">{selectedTicket.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{selectedTicket.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span>{formatDate(selectedTicket.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                      {getStatusIcon(selectedTicket.status)}
                      <span className="font-medium capitalize">{selectedTicket.status.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedTicket.status} onValueChange={(value) => handleUpdateTicketStatus(selectedTicket.id, value)}>
                    <SelectTrigger className="w-48 h-12 bg-white border-gray-200 rounded-xl shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">🔴 Open</SelectItem>
                      <SelectItem value="in_progress">🟡 In Progress</SelectItem>
                      <SelectItem value="resolved">🟢 Resolved</SelectItem>
                      <SelectItem value="closed">⚫ Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTicket(null)}
                    className="h-12 px-6 bg-white border-gray-200 rounded-xl shadow-sm hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Progress Timeline */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Ticket Progress
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${selectedTicket.status === 'open' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${selectedTicket.status === 'open' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">Submitted</span>
                    </div>
                    <div className={`w-8 h-0.5 ${['in_progress', 'resolved', 'closed'].includes(selectedTicket.status) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex items-center gap-2 ${selectedTicket.status === 'in_progress' ? 'text-yellow-600 font-semibold' : ['resolved', 'closed'].includes(selectedTicket.status) ? 'text-gray-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${selectedTicket.status === 'in_progress' ? 'bg-yellow-500' : ['resolved', 'closed'].includes(selectedTicket.status) ? 'bg-gray-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">In Progress</span>
                    </div>
                    <div className={`w-8 h-0.5 ${['resolved', 'closed'].includes(selectedTicket.status) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex items-center gap-2 ${selectedTicket.status === 'resolved' ? 'text-green-600 font-semibold' : selectedTicket.status === 'closed' ? 'text-gray-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full ${selectedTicket.status === 'resolved' ? 'bg-green-500' : selectedTicket.status === 'closed' ? 'bg-gray-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm">Resolved</span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-purple-500" />
                    Conversation ({selectedTicket.messages.length})
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 rounded-2xl p-6">
                    {selectedTicket.messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      selectedTicket.messages.map((message) => (
                        <div key={message.id} className={`flex gap-4 ${message.senderType === 'admin' ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src="" />
                            <AvatarFallback className={message.senderType === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}>
                              {message.sender.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 max-w-lg ${message.senderType === 'admin' ? 'text-right' : ''}`}>
                            <div className={`rounded-2xl p-4 shadow-sm ${message.senderType === 'admin' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 px-2">
                              <span className="font-medium">{message.sender.name}</span>
                              <span className="mx-2">•</span>
                              <span>{formatDate(message.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* New Message Input */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex gap-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={3}
                      className="flex-1 border-0 resize-none focus:ring-0 focus:outline-none"
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!newMessage.trim()}
                        className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-12 rounded-lg">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Tickets List */
          <div className="space-y-6">
            {filteredTickets.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                    <MessageCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
                  <p className="text-gray-500 text-center max-w-md mb-6">
                    {tickets.length === 0 
                      ? "You haven't created any support tickets yet. Click 'Create New Ticket' to get started."
                      : "No tickets match your current filters. Try adjusting your search or filters."
                    }
                  </p>
                  {tickets.length === 0 && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl px-6"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                {getCategoryIcon(ticket.category)}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{ticket.title}</h3>
                                <p className="text-sm text-gray-500">Ticket #{ticket.id}</p>
                              </div>
                              <Badge className={`${getPriorityColor(ticket.priority)} px-3 py-1 text-xs font-semibold border`}>
                                {ticket.priority.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-4 line-clamp-2 bg-gray-50 rounded-lg p-3">{ticket.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                {getStatusIcon(ticket.status)}
                                <span className="font-medium capitalize">{ticket.status.replace("_", " ")}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <MessageCircle className="h-4 w-4 text-purple-500" />
                                <span>{ticket.messages.length} messages</span>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span>{formatDate(ticket.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}