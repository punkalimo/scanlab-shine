import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart, Heart, Star, ArrowLeft, Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Layout from "@/components/Layout";
import { api } from "@/integrations/api/client";
import { useCart } from "@/hooks/useCart";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, addToWishlist, isInWishlist } = useCart();

  const { data: productData, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const result = await api.getProduct(id!);
      return result as any;
    },
    enabled: !!id,
  });

  const product = productData?.product;
  const images = product?.product_images || [];
  const isWishlisted = isInWishlist(product?.id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12">Loading...</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-12">
          <p>Product not found</p>
          <Link to="/spares">
            <Button variant="link">Back to products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
  };

  const handleWishlist = () => {
    addToWishlist(product.id);
  };

  return (
    <Layout>
      <div className="container py-8">
        <Link to="/spares" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to products
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={images[selectedImage]?.image_url || product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img: any, index: number) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-md overflow-hidden border-2 ${
                      selectedImage === index ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-heading font-bold">{product.name}</h1>
                <p className="text-muted-foreground">SKU: {product.sku}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleWishlist}>
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            </div>

            {product.brand && (
              <Badge variant="outline" className="mt-2">{product.brand}</Badge>
            )}

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">K{Number(product.price).toFixed(2)}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-lg text-muted-foreground line-through">
                    K{Number(product.original_price).toFixed(2)}
                  </span>
                )}
              </div>
              {product.discount_percent && (
                <Badge className="mt-2 bg-red-500">{product.discount_percent}% OFF</Badge>
              )}
            </div>

            {product.description && (
              <p className="mt-4 text-muted-foreground">{product.description}</p>
            )}

            <Separator className="my-6" />

            {/* Stock */}
            <div className="flex items-center gap-2 mb-4">
              {product.inventory?.quantity > 0 ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">In Stock</span>
                  <span className="text-muted-foreground">({product.inventory?.quantity} available)</span>
                </>
              ) : (
                <span className="text-red-500 font-medium">Out of Stock</span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <label className="font-medium">Quantity:</label>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!product.inventory?.quantity}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            {/* Shipping Info */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <span className="font-medium">Delivery Options</span>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                <li>• Pickup from store - Free</li>
                <li>• Yango courier delivery - K50-150 depending on location</li>
              </ul>
            </div>

            {/* Compatibility Tags */}
            {product.compatibility_tags && product.compatibility_tags.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Compatible with:</h3>
                <div className="flex flex-wrap gap-2">
                  {product.compatibility_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
