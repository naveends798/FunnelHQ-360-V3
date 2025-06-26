import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, DollarSign, Users, Calendar, Target } from "lucide-react";
import { type Project, type Client } from "@shared/schema";
import { cn } from "@/lib/utils";

type ProjectWithClient = Project & { client: Client };

interface EditProjectStatsModalProps {
  project: ProjectWithClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedProject: Partial<Project>) => void;
}

export default function EditProjectStatsModal({
  project,
  open,
  onOpenChange,
  onSave
}: EditProjectStatsModalProps) {
  const [formData, setFormData] = useState({
    budget: project.budget?.toString() || "0",
    budgetUsed: project.budgetUsed?.toString() || "0", 
    endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
    teamMembers: project.teamMembers || [],
    useAutoEndDate: project.endDate === null, // Use auto if project.endDate is null
  });

  const [newTeamMember, setNewTeamMember] = useState("");

  const handleSave = () => {
    const updatedProject: Partial<Project> = {
      budget: formData.budget || "0",
      budgetUsed: formData.budgetUsed || "0",
      endDate: formData.useAutoEndDate ? null : (formData.endDate ? new Date(formData.endDate) : null),
      teamMembers: formData.teamMembers,
      progress: null, // Always auto-calculate from kanban tasks
    };

    onSave(updatedProject);
    onOpenChange(false);
  };

  const addTeamMember = () => {
    if (newTeamMember.trim() && !formData.teamMembers.includes(newTeamMember.trim())) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, newTeamMember.trim()]
      }));
      setNewTeamMember("");
    }
  };

  const removeTeamMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m !== member)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTeamMember();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Edit Project Stats
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure how your project stats are calculated and displayed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Budget Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <Label className="text-white font-medium">Budget & Revenue</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget" className="text-slate-300">Total Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  className="glass border-white/10 text-white placeholder:text-slate-400"
                />
              </div>
              
              <div>
                <Label htmlFor="budgetUsed" className="text-slate-300">Revenue Received</Label>
                <Input
                  id="budgetUsed"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.budgetUsed}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetUsed: e.target.value }))}
                  className="glass border-white/10 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="text-xs text-slate-400 bg-white/5 p-3 rounded-lg border border-white/10">
              💡 <strong>Tip:</strong> Update "Revenue Received" when clients make payments to track your project earnings.
            </div>
          </div>

          {/* End Date Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <Label className="text-white font-medium">Project Timeline</Label>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useAutoEndDate"
                  checked={formData.useAutoEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, useAutoEndDate: e.target.checked }))}
                  className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <Label htmlFor="useAutoEndDate" className="text-slate-300">
                  Auto-calculate from task due dates
                </Label>
              </div>
              
              {!formData.useAutoEndDate && (
                <div>
                  <Label htmlFor="endDate" className="text-slate-300">Manual End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="glass border-white/10 text-white"
                  />
                </div>
              )}
            </div>
            
          </div>

          {/* Team Members Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <Label className="text-white font-medium">Team Members</Label>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter team member name..."
                  value={newTeamMember}
                  onChange={(e) => setNewTeamMember(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="glass border-white/10 text-white placeholder:text-slate-400 flex-1"
                />
                <Button
                  type="button"
                  onClick={addTeamMember}
                  disabled={!newTeamMember.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.teamMembers.map((member, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-white/10 text-white border-white/20 px-3 py-1"
                    >
                      {member}
                      <button
                        type="button"
                        onClick={() => removeTeamMember(member)}
                        className="ml-2 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}