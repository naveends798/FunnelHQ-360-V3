import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateClientModal from "@/components/create-client-modal";
import EditClientModal from "@/components/edit-client-modal";
import { 
  Search, 
  Plus, 
  User, 
  Mail, 
  Calendar,
  MessageCircle,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { type Client } from "@shared/schema";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setShowEditClient(true);
  };

  const handleDeleteClient = async (client: Client) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refetch clients data
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        setClientToDelete(null);
      } else {
        console.error("Failed to delete client");
        alert("Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Error occurred while deleting client");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
                <p className="text-slate-400">
                  Manage your client relationships and information
                </p>
              </div>
              <Button
                onClick={() => setShowCreateClient(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
          </motion.div>

          {/* Clients Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchTerm ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-slate-400 mb-4">
                  {searchTerm 
                    ? "No clients match your search criteria"
                    : "Get started by adding your first client"
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setShowCreateClient(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                )}
                {searchTerm && (
                  <Button
                    variant="ghost"
                    onClick={() => setSearchTerm("")}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="glass-dark border-white/10 hover:border-white/20 transition-all cursor-pointer group h-auto min-h-[200px]"
                      onClick={() => handleEditClient(client)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start space-x-3">
                          {client.avatar ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
                              <img 
                                src={client.avatar} 
                                alt={`${client.name} avatar`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-white text-base font-semibold group-hover:text-purple-300 transition-colors truncate">
                              {client.name}
                            </CardTitle>
                            <CardDescription className="text-slate-400 flex items-center text-sm mt-1">
                              <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 pb-4">
                        {client.notes && (
                          <div className="mb-4">
                            <p className="text-slate-300 text-sm leading-relaxed line-clamp-3 break-words">
                              {client.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              Joined {new Date(client.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-slate-400 hover:text-white hover:bg-white/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setClientToDelete(client);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <CreateClientModal 
        open={showCreateClient} 
        onOpenChange={setShowCreateClient} 
      />

      <EditClientModal 
        open={showEditClient} 
        onOpenChange={setShowEditClient}
        client={clientToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Client</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {clientToDelete?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && handleDeleteClient(clientToDelete)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}