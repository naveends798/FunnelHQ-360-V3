import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Palette, 
  Type, 
  FileImage, 
  Download, 
  Copy, 
  Check,
  Eye,
  Edit
} from "lucide-react";
import { type Asset } from "@shared/schema";

const brandKitCategories = [
  {
    name: "Logos & Branding",
    folder: "brand-kit",
    types: ["image"],
    tags: ["logo", "brand"],
    icon: FileImage,
    description: "Primary logos, brand marks, and visual identity assets"
  },
  {
    name: "Color Palette",
    folder: "brand-kit", 
    types: ["image", "document"],
    tags: ["colors", "palette"],
    icon: Palette,
    description: "Brand colors, gradients, and color specifications"
  },
  {
    name: "Typography",
    folder: "brand-kit",
    types: ["document"],
    tags: ["typography", "fonts"],
    icon: Type,
    description: "Font files, typography guidelines, and text styles"
  }
];

const BrandKitManager = () => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Fetch brand kit assets
  const { data: brandAssets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets", { organizationId: 1, folder: "brand-kit" }],
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedColor(label);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getBrandAssetsByCategory = (category: typeof brandKitCategories[0]) => {
    return brandAssets?.filter(asset => 
      category.tags.some(tag => asset.tags.includes(tag)) ||
      category.types.includes(asset.type)
    ) || [];
  };

  // Sample brand colors from the design system
  const brandColors = [
    { name: "Primary", value: "#6366f1", description: "Main brand color" },
    { name: "Secondary", value: "#8b5cf6", description: "Accent color" },
    { name: "Success", value: "#10b981", description: "Success states" },
    { name: "Warning", value: "#f59e0b", description: "Warning states" },
    { name: "Error", value: "#ef4444", description: "Error states" },
    { name: "Dark", value: "#1f2937", description: "Dark backgrounds" },
    { name: "Light", value: "#f9fafb", description: "Light backgrounds" },
  ];

  // Sample typography
  const typography = [
    { name: "Heading", font: "Inter", weight: "700", size: "2.25rem", description: "Main headings" },
    { name: "Subheading", font: "Inter", weight: "600", size: "1.5rem", description: "Section headings" },
    { name: "Body", font: "Inter", weight: "400", size: "1rem", description: "Body text" },
    { name: "Caption", font: "Inter", weight: "400", size: "0.875rem", description: "Small text" },
  ];

  return (
    <div className="space-y-6">
      {/* Brand Kit Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {brandKitCategories.map((category, index) => {
          const Icon = category.icon;
          const categoryAssets = getBrandAssetsByCategory(category);
          
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-dark border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Assets</span>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {categoryAssets.length}
                      </Badge>
                    </div>
                    
                    {categoryAssets.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {categoryAssets.slice(0, 4).map((asset) => (
                          <div
                            key={asset.id}
                            className="aspect-square rounded-lg overflow-hidden bg-white/5 group cursor-pointer"
                            onClick={() => window.open(asset.url, '_blank')}
                          >
                            {asset.thumbnailUrl ? (
                              <img
                                src={asset.thumbnailUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Icon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No assets yet</p>
                      </div>
                    )}
                    
                    <Button variant="outline" className="w-full mt-4 glass border-white/20 text-white hover:bg-white/10">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Brand Colors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-dark border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Palette className="h-5 w-5 mr-2" />
              Brand Colors
            </CardTitle>
            <CardDescription className="text-slate-400">
              Official brand color palette with hex values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {brandColors.map((color) => (
                <div key={color.name} className="space-y-3">
                  <div
                    className="aspect-square rounded-lg border-2 border-white/10 cursor-pointer group relative overflow-hidden"
                    style={{ backgroundColor: color.value }}
                    onClick={() => copyToClipboard(color.value, color.name)}
                  >
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {copiedColor === color.name ? (
                        <Check className="h-6 w-6 text-green-400" />
                      ) : (
                        <Copy className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{color.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{color.value}</p>
                    <p className="text-xs text-slate-500">{color.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Typography */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-dark border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Type className="h-5 w-5 mr-2" />
              Typography
            </CardTitle>
            <CardDescription className="text-slate-400">
              Font families, weights, and sizes used across the brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {typography.map((type) => (
                <div key={type.name} className="flex items-center justify-between p-4 glass rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-4">
                      <h3 
                        className="text-white font-medium"
                        style={{ 
                          fontFamily: type.font,
                          fontWeight: type.weight,
                          fontSize: type.size
                        }}
                      >
                        {type.name}
                      </h3>
                      <Badge variant="secondary" className="bg-white/10 text-slate-300">
                        {type.font}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{type.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>Weight: {type.weight}</span>
                      <span>Size: {type.size}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`font-family: ${type.font}; font-weight: ${type.weight}; font-size: ${type.size};`, type.name)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedColor === type.name ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BrandKitManager;