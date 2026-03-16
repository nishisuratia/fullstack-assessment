'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart';

interface Product {
  stacklineSku: string;
  title: string;
  categoryName: string;
  subCategoryName: string;
  imageUrls: string[];
  featureBullets: string[];
  retailerSku: string;
  retailPrice: number;
}

export default function ProductPage() {
  const params = useParams<{ sku: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const {
    items: cartItems,
    selectedItems,
    addItem,
    totalPrice,
    setItemSelected,
    setAllSelected,
  } = useCart();

  useEffect(() => {
    if (!params.sku) return;

    fetch(`/api/products/${params.sku}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [params.sku]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <Card className="p-8">
            <p className="text-center text-muted-foreground">Product not found</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-96 w-full bg-muted">
                  {product.imageUrls[selectedImage] && (
                    <Image
                      src={product.imageUrls[selectedImage]}
                      alt={product.title}
                      fill
                      className="object-contain p-8"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {product.imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.imageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-20 border-2 rounded-lg overflow-hidden ${
                      selectedImage === idx ? 'border-primary' : 'border-muted'
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`${product.title} - Image ${idx + 1}`}
                      fill
                      className="object-contain p-2"
                      sizes="100px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary">{product.categoryName}</Badge>
                <Badge variant="outline">{product.subCategoryName}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              {product.retailPrice > 0 && (
                <p className="text-2xl font-bold text-primary mt-2">
                  ${product.retailPrice.toFixed(2)}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">SKU: {product.retailerSku}</p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (!product) return;
                addItem(
                  {
                    stacklineSku: product.stacklineSku,
                    title: product.title,
                    categoryName: product.categoryName,
                    subCategoryName: product.subCategoryName,
                    imageUrl: product.imageUrls[0],
                    retailPrice: product.retailPrice,
                  },
                  1
                );
                setIsCheckoutOpen(true);
              }}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>

            {isCheckoutOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
                <div className="h-full w-full max-w-md bg-background shadow-lg flex flex-col">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-semibold">Your cart</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsCheckoutOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      ✕
                    </Button>
                  </div>

                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={
                          cartItems.length > 0 &&
                          cartItems.every((item) => item.selected)
                        }
                        onChange={(e) => setAllSelected(e.target.checked)}
                      />
                      <span>Select items to checkout</span>
                    </label>
                    <span>{cartItems.length} in cart · {selectedItems.length} selected</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {cartItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Your cart is empty. Add a product to get started.
                      </p>
                    ) : (
                      cartItems.map((item) => (
                        <div key={item.stacklineSku} className="flex gap-3">
                          <div className="pt-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={item.selected}
                              onChange={(e) =>
                                setItemSelected(item.stacklineSku, e.target.checked)
                              }
                            />
                          </div>
                          <div className="relative h-20 w-20 rounded-md border bg-muted flex-shrink-0 overflow-hidden">
                            {item.imageUrl && (
                              <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fill
                                className="object-contain p-1"
                                sizes="80px"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium line-clamp-2">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.categoryName} · {item.subCategoryName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                            {item.retailPrice > 0 && (
                              <p className="mt-2 text-sm font-semibold text-primary">
                                ${(item.retailPrice * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t px-4 py-4 space-y-2">
                    {totalPrice > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated total</span>
                        <span className="font-semibold">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <Link href="/checkout">
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={cartItems.length === 0 || selectedItems.length === 0}
                      >
                        Proceed to Checkout
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => setIsCheckoutOpen(false)}
                    >
                      Continue shopping
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {product.featureBullets.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold mb-3">Features</h2>
                  <ul className="space-y-2">
                    {product.featureBullets.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
