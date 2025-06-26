import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
// import { useNotifications } from "@/hooks/useNotifications";

interface DesignComment {
  id: number;
  content: string;
  author: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'normal' | 'high';
  authorId: number;
  designId: number;
}

interface UseDesignCommentsProps {
  designId: number;
  projectId: number;
  currentUserId: number;
}

export function useDesignComments({ designId, projectId, currentUserId }: UseDesignCommentsProps) {
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  // const { addNotification } = useNotifications();

  const addComment = useCallback(async (content: string, priority: 'low' | 'normal' | 'high' = 'normal') => {
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      const newComment: DesignComment = {
        id: Date.now(),
        content: content.trim(),
        author: 'Current User', // Get from auth context
        authorId: currentUserId,
        designId,
        timestamp: new Date(),
        status: 'pending',
        priority
      };

      setComments(prev => [...prev, newComment]);

      // Add notification for team members
      // addNotification({
      //   title: 'New Design Comment',
      //   message: `New comment added to design`,
      //   type: 'comment',
      //   actionUrl: `/projects/${projectId}#design-${designId}`
      // });

      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });

      return newComment;
    } catch (error) {
      toast({
        title: "Error adding comment",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [designId, projectId, currentUserId, toast]);

  const updateCommentStatus = useCallback(async (commentId: number, status: DesignComment['status']) => {
    try {
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, status }
            : comment
        )
      );

      if (status === 'completed') {
        toast({
          title: "Comment marked as done",
          description: "The feedback has been marked as completed",
        });
      }
    } catch (error) {
      toast({
        title: "Error updating comment",
        description: "Failed to update comment status",
        variant: "destructive",
      });
    }
  }, [toast]);

  const deleteComment = useCallback(async (commentId: number) => {
    try {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      toast({
        title: "Comment deleted",
        description: "The comment has been removed",
      });
    } catch (error) {
      toast({
        title: "Error deleting comment",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    comments,
    isLoading,
    addComment,
    updateCommentStatus,
    deleteComment,
    setComments
  };
}