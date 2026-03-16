'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/lib/cart';

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Purchase successful</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for your order. Your products are being processed.
          </p>
          <Link href="/">
            <Button className="mt-2" size="lg">
              Back to home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

