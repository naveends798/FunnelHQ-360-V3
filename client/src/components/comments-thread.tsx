import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageCircle, 
  Reply, 
  MoreHorizontal,
  Pin,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Send,
  Tag,
  Clock,
  User,
  AtSign,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Comment {
  id: number;
  projectId: number;
  parentId?: number | null;
  authorId: number;
  authorType: "admin" | "team_member" | "client";
  content: string;
  mentions: number[];
  attachments: string[];
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  author: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
  };
  replies?: Comment[];
}

interface User {
  id: number;
  name: string;
  avatar?: string;
  role: string;
}

interface CommentsThreadProps {
  projectId: number;
  currentUserId: number;
  users: User[];
  onCommentCreate?: (comment: Omit<Comment, 'id' | 'author' | 'createdAt' | 'updatedAt'>) => void;
  onCommentUpdate?: (commentId: number, updates: Partial<Comment>) => void;
  onCommentDelete?: (commentId: number) => void;
}

const PRIORITY_COLORS = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  normal: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30"
};

const STATUS_COLORS = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-slate-500/20 text-slate-400 border-slate-500/30"
};

export default function CommentsThread({ 
  projectId, 
  currentUserId, 
  users, 
  onCommentCreate, 
  onCommentUpdate, 
  onCommentDelete 
}: CommentsThreadProps) {
  const { currentRole, authUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewComment, setShowNewComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentPriority, setNewCommentPriority] = useState<Comment['priority']>("normal");
  const [newCommentTags, setNewCommentTags] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | Comment['status']>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
    fetchAvailableUsers();
  }, [projectId]);

  useEffect(() => {
    // Refetch available users when role changes
    if (currentRole && projectId) {
      fetchAvailableUsers();
    }
  }, [currentRole, projectId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!currentRole || !authUser?.id) return;
    
    try {
      const params = new URLSearchParams({
        role: currentRole,
        userId: authUser.id.toString(),
        organizationId: (authUser.organizationId || 1).toString()
      });
      
      const response = await fetch(`/api/projects/${projectId}/available-users?${params}`);
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(commentMap.get(comment.id)!);
        }
      } else {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    return rootComments;
  };

  const handleMentionDetection = (text: string, position: number) => {
    const beforeCursor = text.substring(0, position);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      // Use availableUsers instead of the passed users prop for role-based filtering
      const suggestions = availableUsers.filter(user => 
        user.name.toLowerCase().includes(query)
      );
      setMentionSuggestions(suggestions);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    const beforeCursor = newComment.substring(0, cursorPosition);
    const afterCursor = newComment.substring(cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    const newText = beforeCursor.substring(0, atIndex) + `@${user.name} ` + afterCursor;
    setNewComment(newText);
    setShowMentions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = atIndex + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const extractMentions = (text: string): number[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: number[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Use availableUsers to ensure only valid mentions are extracted
      const mentionedUser = availableUsers.find(user => user.name === match[1]);
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }

    return mentions;
  };

  const extractTags = (text: string): string[] => {
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1].toLowerCase());
    }

    return tags;
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    const mentions = extractMentions(newComment);
    const autoTags = extractTags(newComment);
    const allTags = [...new Set([...newCommentTags, ...autoTags])];

    const commentData = {
      projectId,
      parentId: replyingTo,
      authorId: authUser?.id || currentUserId,
      authorType: currentRole || "admin" as const,
      content: newComment.trim(),
      mentions,
      attachments: [],
      status: "open" as const,
      priority: newCommentPriority,
      tags: allTags
    };

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      });

      if (response.ok) {
        setNewComment("");
        setNewCommentTags([]);
        setReplyingTo(null);
        setShowNewComment(false);
        fetchComments();
        
        if (onCommentCreate) {
          onCommentCreate(commentData);
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const handleResolveComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: authUser?.id || currentUserId })
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchComments();
        if (onCommentDelete) {
          onCommentDelete(commentId);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const toggleCommentExpansion = (commentId: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isResolved = comment.status === 'resolved';

    return (
      <motion.div
        key={comment.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative",
          depth > 0 && "ml-8 border-l border-white/10 pl-4",
          isResolved && "opacity-60"
        )}
      >
        {/* Comment */}
        <div className="glass rounded-xl p-4 mb-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author.avatar} />
                <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white">{comment.author.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {comment.author.role}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(comment.createdAt).toLocaleString()}
                  {comment.updatedAt !== comment.createdAt && (
                    <span>(edited)</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={STATUS_COLORS[comment.status]}>
                {comment.status.replace('_', ' ')}
              </Badge>
              <Badge className={PRIORITY_COLORS[comment.priority]}>
                <AlertCircle className="h-3 w-3 mr-1" />
                {comment.priority}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="mb-3">
            <div className="text-slate-200 whitespace-pre-wrap">
              {comment.content.split(/(@\w+|#\w+)/).map((part, index) => {
                if (part.startsWith('@')) {
                  return (
                    <span key={index} className="text-primary font-medium">
                      {part}
                    </span>
                  );
                } else if (part.startsWith('#')) {
                  return (
                    <span key={index} className="text-blue-400 font-medium">
                      {part}
                    </span>
                  );
                } else {
                  return part;
                }
              })}
            </div>
          </div>

          {/* Tags */}
          {comment.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {comment.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs bg-slate-500/20 text-slate-400 border-slate-500/30"
                >
                  <Hash className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Attachments */}
          {comment.attachments.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
                <Paperclip className="h-3 w-3" />
                Attachments
              </div>
              <div className="space-y-1">
                {comment.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary text-sm hover:underline"
                  >
                    {attachment.split('/').pop()}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
                className="text-slate-400 hover:text-white h-8 px-3"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCommentExpansion(comment.id)}
                  className="text-slate-400 hover:text-white h-8 px-3"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {!isResolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveComment(comment.id)}
                  className="text-green-400 hover:text-green-300 h-8 px-3"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteComment(comment.id)}
                className="text-red-400 hover:text-red-300 h-8 px-3"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Reply Form */}
        <AnimatePresence>
          {replyingTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 mb-4"
            >
              <div className="glass rounded-xl p-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={newComment}
                      onChange={(e) => {
                        setNewComment(e.target.value);
                        setCursorPosition(e.target.selectionStart || 0);
                        handleMentionDetection(e.target.value, e.target.selectionStart || 0);
                      }}
                      placeholder="Write a reply... Use @username to mention someone, #tag for tags"
                      className="glass border-0 text-white resize-none"
                      rows={3}
                    />
                    
                    {/* Mention Suggestions */}
                    <AnimatePresence>
                      {showMentions && mentionSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full mb-2 left-0 right-0 bg-slate-800/95 backdrop-blur-md rounded-lg border border-white/30 max-h-32 overflow-y-auto z-10 shadow-xl"
                        >
                          {mentionSuggestions.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => insertMention(user)}
                              className="w-full flex items-center space-x-2 p-3 hover:bg-white/20 transition-colors text-left border-b border-white/10 last:border-b-0"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-white font-medium text-sm">{user.name}</div>
                                <div className="text-slate-300 text-xs">{user.role}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Select value={newCommentPriority} onValueChange={(value: Comment['priority']) => setNewCommentPriority(value)}>
                      <SelectTrigger className="w-32 glass border-0 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setNewComment("");
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        <AnimatePresence>
          {hasReplies && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const filteredComments = buildCommentTree(comments).filter(comment => {
    if (filterStatus === "all") return true;
    return comment.status === filterStatus;
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "priority":
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      default: // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 bg-white/10 rounded-full"></div>
              <div>
                <div className="h-4 w-24 bg-white/10 rounded mb-1"></div>
                <div className="h-3 w-32 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 w-3/4 bg-white/10 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Comments ({comments.length})
          </h3>
          
          <div className="flex items-center space-x-2">
            <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="w-32 glass border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
              <SelectTrigger className="w-32 glass border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button
          onClick={() => setShowNewComment(!showNewComment)}
          className="bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          New Comment
        </Button>
      </div>

      {/* New Comment Form */}
      <AnimatePresence>
        {showNewComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    setCursorPosition(e.target.selectionStart || 0);
                    handleMentionDetection(e.target.value, e.target.selectionStart || 0);
                  }}
                  placeholder="Start a new discussion... Use @username to mention someone, #tag for tags"
                  className="glass border-0 text-white resize-none"
                  rows={4}
                />
                
                {/* Mention Suggestions */}
                <AnimatePresence>
                  {showMentions && mentionSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute bottom-full mb-2 left-0 right-0 bg-slate-800/95 backdrop-blur-md rounded-lg border border-white/30 max-h-32 overflow-y-auto z-10 shadow-xl"
                    >
                      {mentionSuggestions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => insertMention(user)}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-white/20 transition-colors text-left border-b border-white/10 last:border-b-0"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white font-medium text-sm">{user.name}</div>
                            <div className="text-slate-300 text-xs">{user.role}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex items-center justify-between">
                <Select value={newCommentPriority} onValueChange={(value: Comment['priority']) => setNewCommentPriority(value)}>
                  <SelectTrigger className="w-32 glass border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowNewComment(false);
                      setNewComment("");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments List */}
      {sortedComments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No comments yet</h3>
          <p className="text-slate-500 mb-6">Start the conversation by posting the first comment</p>
          <Button
            onClick={() => setShowNewComment(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Add First Comment
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}