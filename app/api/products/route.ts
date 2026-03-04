import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/lib/products';

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);

  const filters = {
    category: searchParams.get('category') || undefined,
    subCategory: searchParams.get('subCategory') || undefined,
    search: searchParams.get('search') || undefined,
    limit: Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), MAX_LIMIT),
    offset: Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0),
  };

  const products = productService.getAll(filters);
  const total = productService.getTotalCount({
    category: filters.category,
    subCategory: filters.subCategory,
    search: filters.search,
  });

  return NextResponse.json({
    products,
    total,
    limit: filters.limit,
    offset: filters.offset,
  });
}
