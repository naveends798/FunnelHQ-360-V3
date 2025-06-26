import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  X, 
  SortAsc, 
  Calendar,
  DollarSign,
  Users,
  Clock,
  Grid3X3,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterState {
  search: string;
  status: string;
  priority: string;
  sortBy: string;
  viewMode: "grid" | "list";
}

interface ProjectFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export default function ProjectFilters({ 
  filters, 
  onFiltersChange, 
  totalCount, 
  filteredCount 
}: ProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      priority: "all",
      sortBy: "recent",
      viewMode: filters.viewMode // Keep view mode
    });
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status !== "all") || (filters.priority && filters.priority !== "all") || filters.sortBy !== "recent";
  const activeFilterCount = [filters.search, filters.status !== "all" ? filters.status : "", filters.priority !== "all" ? filters.priority : ""].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search projects, clients..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="glass border-0 pl-10 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateFilter("search", "")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "glass text-slate-400 hover:text-white relative",
            showAdvanced && "text-primary"
          )}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-primary text-white text-xs flex items-center justify-center rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* View Toggle */}
        <div className="flex items-center glass rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateFilter("viewMode", "grid")}
            className={cn(
              "h-8 w-8 text-slate-400",
              filters.viewMode === "grid" && "bg-primary/20 text-primary"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateFilter("viewMode", "list")}
            className={cn(
              "h-8 w-8 text-slate-400",
              filters.viewMode === "list" && "bg-primary/20 text-primary"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-slate-400 hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </motion.div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-xl p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Status</label>
                <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                  <SelectTrigger className="glass border-0 text-white">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter("priority", value)}>
                  <SelectTrigger className="glass border-0 text-white">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Sort by</label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
                  <SelectTrigger className="glass border-0 text-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Quick filters</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Due Soon", icon: Clock, filter: () => updateFilter("sortBy", "deadline") },
                  { label: "Over Budget", icon: DollarSign, filter: () => updateFilter("priority", "high") },
                  { label: "Team Projects", icon: Users, filter: () => updateFilter("status", "active") },
                  { label: "This Month", icon: Calendar, filter: () => updateFilter("sortBy", "recent") },
                ].map((tag, index) => (
                  <motion.div
                    key={tag.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={tag.filter}
                      className="glass border-white/10 text-slate-300 hover:text-white hover:border-primary/50"
                    >
                      <tag.icon className="mr-2 h-3 w-3" />
                      {tag.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Showing {filteredCount} of {totalCount} projects
          {hasActiveFilters && " (filtered)"}
        </span>
        
        {filters.sortBy !== "recent" && (
          <div className="flex items-center space-x-2">
            <SortAsc className="h-4 w-4" />
            <span>Sorted by {filters.sortBy}</span>
          </div>
        )}
      </div>
    </div>
  );
}