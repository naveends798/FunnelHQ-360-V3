import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bold, 
  Italic, 
  List, 
  Link2, 
  Code, 
  AtSign, 
  Hash,
  Smile,
  Image,
  Paperclip
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  avatar?: string;
  role: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users?: User[];
  onMentionSelect?: (userId: number) => void;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

interface MentionSuggestion {
  user: User;
  position: number;
  query: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message...",
  users = [],
  onMentionSelect,
  className,
  rows = 4,
  disabled = false
}: RichTextEditorProps) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion | null>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle mention detection
  const handleTextChange = (newValue: string) => {
    onChange(newValue);
    
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart || 0;
      setCursorPosition(position);
      
      // Check for mention pattern
      const beforeCursor = newValue.substring(0, position);
      const atMatch = beforeCursor.match(/@(\w*)$/);
      
      if (atMatch && users.length > 0) {
        const query = atMatch[1].toLowerCase();
        const filteredUsers = users.filter(user => 
          user.name.toLowerCase().includes(query)
        );
        
        if (filteredUsers.length > 0) {
          setMentionSuggestions({
            user: filteredUsers[0], // For simplicity, just show first match
            position: beforeCursor.lastIndexOf('@'),
            query: atMatch[1]
          });
        } else {
          setMentionSuggestions(null);
        }
      } else {
        setMentionSuggestions(null);
      }
    }
  };

  // Insert mention
  const insertMention = (user: User) => {
    if (!mentionSuggestions || !textareaRef.current) return;
    
    const beforeMention = value.substring(0, mentionSuggestions.position);
    const afterCursor = value.substring(cursorPosition);
    const newValue = beforeMention + `@${user.name} ` + afterCursor;
    
    onChange(newValue);
    setMentionSuggestions(null);
    
    if (onMentionSelect) {
      onMentionSelect(user.id);
    }
    
    // Focus and position cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeMention.length + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Format text helpers
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const selectedText = value.substring(start, end);
    
    const beforeSelection = value.substring(0, start);
    const afterSelection = value.substring(end);
    
    const newValue = beforeSelection + prefix + selectedText + suffix + afterSelection;
    onChange(newValue);
    
    // Restore focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newStart = start + prefix.length;
        const newEnd = newStart + selectedText.length;
        textareaRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart || 0;
    const beforeCursor = value.substring(0, start);
    const afterCursor = value.substring(start);
    
    const newValue = beforeCursor + text + afterCursor;
    onChange(newValue);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + text.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Format the text for display (highlighting mentions, hashtags, etc.)
  const formatDisplayText = (text: string) => {
    return text.split(/(@\w+|#\w+|\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-medium bg-primary/20 px-1 rounded">
            {part}
          </span>
        );
      } else if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-400 font-medium bg-blue-400/20 px-1 rounded">
            {part}
          </span>
        );
      } else if (part.match(/^\*\*.*\*\*$/)) {
        return (
          <span key={index} className="font-bold">
            {part.slice(2, -2)}
          </span>
        );
      } else if (part.match(/^\*.*\*$/) && !part.match(/^\*\*.*\*\*$/)) {
        return (
          <span key={index} className="italic">
            {part.slice(1, -1)}
          </span>
        );
      } else if (part.match(/^`.*`$/)) {
        return (
          <span key={index} className="font-mono bg-slate-700 text-slate-200 px-1 rounded text-sm">
            {part.slice(1, -1)}
          </span>
        );
      } else if (part.match(/^\[.*?\]\(.*?\)$/)) {
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a key={index} href={linkMatch[2]} className="text-primary underline">
              {linkMatch[1]}
            </a>
          );
        }
      }
      return part;
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => wrapSelection('**')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => wrapSelection('*')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <Italic className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => wrapSelection('`')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <Code className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertAtCursor('\n- ')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertAtCursor('[link text](url)')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <Link2 className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertAtCursor('@')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <AtSign className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertAtCursor('#')}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            disabled={disabled}
          >
            <Hash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Text Input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="glass border-0 text-white resize-none"
          onFocus={() => setShowFormatting(true)}
          onBlur={() => setTimeout(() => setShowFormatting(false), 100)}
        />
        
        {/* Mention Suggestions */}
        <AnimatePresence>
          {mentionSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full mb-2 left-0 right-0 glass rounded-lg border border-white/20 z-10"
            >
              <button
                onClick={() => insertMention(mentionSuggestions.user)}
                className="w-full flex items-center space-x-3 p-3 hover:bg-white/10 transition-colors text-left rounded-lg"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={mentionSuggestions.user.avatar} />
                  <AvatarFallback>{mentionSuggestions.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-white font-medium">{mentionSuggestions.user.name}</div>
                  <div className="text-slate-400 text-sm">{mentionSuggestions.user.role}</div>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview */}
      {value && showFormatting && (
        <div className="glass rounded-lg p-3 border border-white/10">
          <div className="text-slate-300 text-sm mb-2">Preview:</div>
          <div className="text-white text-sm leading-relaxed">
            {formatDisplayText(value)}
          </div>
        </div>
      )}
      
      {/* Help Text */}
      {showFormatting && (
        <div className="text-xs text-slate-500 space-y-1">
          <div>**bold** • *italic* • `code` • @username • #hashtag</div>
          <div>[link text](url) • Use toolbar buttons for quick formatting</div>
        </div>
      )}
    </div>
  );
}