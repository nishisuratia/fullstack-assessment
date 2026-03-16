'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCart } from '@/lib/cart';

type PaymentMethod = 'card' | 'paypal' | 'apple';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, selectedItems, totalPrice, setItemSelected, setAllSelected } = useCart();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !paymentMethod) {
      setFormError('Please complete all fields to continue.');
      return;
    }

    setSubmitting(true);

    // Simulate a short processing delay, then navigate to success page.
    setTimeout(() => {
      router.push('/checkout/success');
    }, 600);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              Your cart is empty. Please add at least one product before checking out.
            </p>
          </Card>
          <Link href="/">
            <Button variant="outline">Back to products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-4">
          {/* Your cart: full product history with checkboxes */}
          <Card className="overflow-hidden">
            <CardContent className="pt-6 space-y-4 text-sm">
              <h2 className="text-lg font-semibold">Your cart</h2>
              <p className="text-xs text-muted-foreground">
                All products you added. Check the ones you want to purchase.
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={
                      items.length > 0 && items.every((item) => item.selected)
                    }
                    onChange={(e) => setAllSelected(e.target.checked)}
                  />
                  <span>Select all</span>
                </label>
                <span>{items.length} in cart · {selectedItems.length} selected</span>
              </div>
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.stacklineSku} className="flex gap-3">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={item.selected}
                        onChange={(e) =>
                          setItemSelected(item.stacklineSku, e.target.checked)
                        }
                      />
                    </div>
                    <div className="relative h-16 w-16 rounded-md border bg-muted flex-shrink-0 overflow-hidden">
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-contain p-1"
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1">
                        <Badge variant="secondary">{item.categoryName}</Badge>
                        <Badge variant="outline">{item.subCategoryName}</Badge>
                      </div>
                      <p className="font-medium line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity}
                      </p>
                      {item.retailPrice > 0 && (
                        <p className="mt-1 text-sm font-semibold text-primary">
                          ${(item.retailPrice * item.quantity).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order summary: only selected items going to checkout */}
          <Card className="overflow-hidden">
            <CardContent className="pt-6 space-y-4 text-sm">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <p className="text-xs text-muted-foreground">
                Items you selected to purchase.
              </p>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Select at least one item above to proceed.
                </p>
              ) : (
                <>
                  <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
                    {selectedItems.map((item) => (
                      <div key={item.stacklineSku} className="flex gap-3">
                        <div className="relative h-16 w-16 rounded-md border bg-muted flex-shrink-0 overflow-hidden">
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-contain p-1"
                              sizes="64px"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-2 mb-1">
                            <Badge variant="secondary">{item.categoryName}</Badge>
                            <Badge variant="outline">{item.subCategoryName}</Badge>
                          </div>
                          <p className="font-medium line-clamp-2">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Qty: {item.quantity}
                          </p>
                          {item.retailPrice > 0 && (
                            <p className="mt-1 text-sm font-semibold text-primary">
                              ${(item.retailPrice * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Checkout</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your details to complete this purchase as a guest.
          </p>

          <Card>
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="fullName">
                    Full name
                  </label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Payment method</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      className={`border rounded-md px-3 py-2 text-sm text-left ${
                        paymentMethod === 'card'
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-muted'
                      }`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      Credit Card
                    </button>
                    <button
                      type="button"
                      className={`border rounded-md px-3 py-2 text-sm text-left ${
                        paymentMethod === 'paypal'
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-muted'
                      }`}
                      onClick={() => setPaymentMethod('paypal')}
                    >
                      PayPal
                    </button>
                    <button
                      type="button"
                      className={`border rounded-md px-3 py-2 text-sm text-left ${
                        paymentMethod === 'apple'
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-muted'
                      }`}
                      onClick={() => setPaymentMethod('apple')}
                    >
                      Apple Pay
                    </button>
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-destructive" aria-live="polite">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitting || selectedItems.length === 0}
                >
                  {submitting ? 'Processing...' : 'Confirm purchase'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Back to products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

