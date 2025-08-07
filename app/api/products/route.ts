// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await db.product.findMany({
      where: { userId: session.user.id },
      include: {
        // Include listing data to show where each product is listed
        listings: {
          include: {
            shop: {
              include: {
                marketplace: true, // Get marketplace info like name and logo
              },
            },
          },
        },
      },
     
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, sku, price, description } = body;

    if (!title || !sku || !price) {
      return NextResponse.json({ error: 'Title, SKU, and Price are required' }, { status: 400 });
    }

    const newProduct = await db.product.create({
      data: {
        title,
        sku,
        price: parseFloat(price),
        description,
        userId: session.user.id,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}