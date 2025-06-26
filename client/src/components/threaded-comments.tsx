import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ThumbsUp, 
  CheckSquare, 
  Reply, 
  MoreHorizontal,
  Send,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface Comment {
  id: number;
  content: string;
  author: string;
  authorRole?: 'client' | 'team_member' | 'admin';
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'normal' | 'high';
  parentId?: number;
  replies?: Comment[];
}

interface ThreadedCommentsProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: number) => void;
  onUpdateStatus: (commentId: number, status: Comment['status']) => void;
  currentUser: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: number) => void;
  onUpdateStatus: (commentId: number, status: Comment['status']) => void;
  isReplying: boolean;
  onAddReply: (content: string, parentId: number) => void;
  onCancelReply: () => void;
  currentUser: string;
  depth?: number;
}

function CommentItem({ 
  comment, 
  onReply, 
  onUpdateStatus, 
  isReplying, 
  onAddReply, 
  onCancelReply,
  currentUser,
  depth = 0 
}: CommentItemProps) {
  const [replyContent, setReplyContent] = useState("");
  const [showReplies, setShowReplies] = useState(true);
  
  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onAddReply(replyContent, comment.id);
      setReplyContent("");
      onCancelReply();
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-6 border-l-2 border-primary/30 pl-4' : ''} ${depth > 0 ? 'relative' : ''}`}
    >
      {depth > 0 && (
        <div className="absolute -left-1 top-4 w-2 h-2 bg-primary/50 rounded-full"></div>
      )}
      <div className={`bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-all duration-200 ${
        comment.status === 'completed' ? 'ring-1 ring-green-500/20' : ''
      } ${depth > 0 ? 'border-l-2 border-l-primary/20' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              comment.authorRole === 'client' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              comment.authorRole === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {comment.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-white text-sm">{comment.author}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    comment.authorRole === 'client' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    comment.authorRole === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                    'bg-green-500/20 text-green-400 border-green-500/30'
                  }`}
                >
                  {comment.authorRole === 'client' ? 'Client' : 
                   comment.authorRole === 'admin' ? 'Admin' : 'Team'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-slate-500">
                  {comment.timestamp.toLocaleDateString()} at {comment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {comment.priority && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      comment.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      comment.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {comment.priority}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className={`h-6 px-2 text-xs transition-all duration-200 ${
                comment.status === 'completed' 
                  ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30' 
                  : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
              }`}
              onClick={() => {
                const newStatus = comment.status === 'completed' ? 'pending' : 'completed';
                onUpdateStatus(comment.id, newStatus);
              }}
            >
              {comment.status === 'completed' ? (
                <CheckSquare className="h-3 w-3 mr-1" />
              ) : (
                <ThumbsUp className="h-3 w-3 mr-1" />
              )}
              {comment.status === 'completed' ? 'Done' : 'Mark Done'}
            </Button>
          </div>
        </div>
        
        {depth > 0 && comment.parentId && (
          <div className="mb-2 text-xs text-slate-500 italic">
            ↳ Replying to previous comment
          </div>
        )}
        <p className="text-slate-300 text-sm mb-3 leading-relaxed">{comment.content}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {hasReplies && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-slate-400 hover:text-white p-0 h-auto"
              >
                {showReplies ? (
                  <ChevronDown className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1" />
                )}
                {comment.replies?.length} {comment.replies?.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}
            
            {depth < maxDepth && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReply(comment.id)}
                className="text-xs text-slate-400 hover:text-white p-0 h-auto"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>
        </div>
        
        {/* Reply Form */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-3">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${comment.author}...`}
                  className="bg-white/5 border-white/10 text-white placeholder-slate-400 resize-none text-sm"
                  rows={3}
                />
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelReply}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim()}
                    className="bg-primary hover:bg-primary/90 text-xs"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Nested Replies */}
      <AnimatePresence>
        {hasReplies && showReplies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3"
          >
            {comment.replies!.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onUpdateStatus={onUpdateStatus}
                isReplying={false}
                onAddReply={onAddReply}
                onCancelReply={onCancelReply}
                currentUser={currentUser}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ThreadedComments({
  comments,
  onAddComment,
  onUpdateStatus,
  currentUser
}: ThreadedCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  
  // Organize comments into threads (top-level comments with their replies)
  const threadedComments = comments.filter(comment => !comment.parentId);
  
  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment("");
    }
  };
  
  const handleAddReply = (content: string, parentId: number) => {
    onAddComment(content, parentId);
    setReplyingTo(null);
  };
  
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Comments List */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 max-h-[400px]">
        {threadedComments.length > 0 ? (
          threadedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={setReplyingTo}
              onUpdateStatus={onUpdateStatus}
              isReplying={replyingTo === comment.id}
              onAddReply={handleAddReply}
              onCancelReply={() => setReplyingTo(null)}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No comments yet. Be the first to share feedback!</p>
          </div>
        )}
      </div>
      
      {/* Add New Comment */}
      {replyingTo === null && (
        <div className="pt-4 border-t border-white/10 bg-slate-800/30 rounded-lg p-4">
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your feedback or suggestions..."
              className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-lg text-white placeholder-slate-400 resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
              rows={3}
            />
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium transition-all duration-200 shadow-lg"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}