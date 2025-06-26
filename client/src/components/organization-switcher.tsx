import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationSwitcher() {
  const { organization, organizationList, switchOrganization, createOrganization, isLoaded } = useOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    setIsCreating(true);
    try {
      const newOrg = await createOrganization({
        name: newOrgName.trim(),
      });
      
      // Initialize with Pro Trial plan metadata
      await newOrg.update({
        publicMetadata: {
          plan: "pro_trial",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        }
      });
      
      // Switch to the new organization
      await switchOrganization(newOrg.id);
      
      setShowCreateDialog(false);
      setNewOrgName("");
    } catch (error) {
      console.error("Error creating organization:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-3">
            <Building2 className="h-4 w-4" />
            <span className="max-w-[150px] truncate">
              {organization?.name || "Select Organization"}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizationList?.map((org) => (
            <DropdownMenuItem
              key={org.organization.id}
              onClick={() => switchOrganization(org.organization.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{org.organization.name}</span>
              {organization?.id === org.organization.id && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage separate projects and team members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="My Company"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateOrganization();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewOrgName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={!newOrgName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}