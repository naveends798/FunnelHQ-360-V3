import { Card, CardContent } from "@/components/ui/card";
import { type Client } from "@shared/schema";
import { Star, MapPin, Calendar } from "lucide-react";

interface ClientSpotlightProps {
  client: Client;
}

export default function ClientSpotlight({ client }: ClientSpotlightProps) {
  const rating = parseFloat(client.rating || "5.0");
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <Card className="glass border-white/10 p-6">
      <CardContent className="p-0">
        <h3 className="text-lg font-bold text-white mb-4">Client Spotlight</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
            <img 
              src={client.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60&q=80"} 
              alt={client.name} 
              className="w-12 h-12 rounded-xl object-cover" 
            />
            <div className="flex-1">
              <h4 className="text-white font-semibold">{client.name}</h4>
              <p className="text-slate-400 text-sm">{client.company}</p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="flex text-yellow-400">
                  {[...Array(fullStars)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                  {hasHalfStar && <Star className="w-3 h-3 fill-current opacity-50" />}
                  {[...Array(5 - Math.ceil(rating))].map((_, i) => (
                    <Star key={`empty-${i}`} className="w-3 h-3 text-gray-600" />
                  ))}
                </div>
                <span className="text-slate-400 text-xs">{rating}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-slate-300 text-sm mb-2">
              "{client.bio || "Exceptional work quality and communication"}"
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {client.location || "Location not specified"}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Active since {client.joinedAt ? new Date(client.joinedAt).getFullYear() : "2023"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
