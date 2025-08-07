// app/api/shops/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // Assuming your auth.ts is in the root
import { db } from '@/lib/db'; // Your db client instance
import { ConnectionType } from '@prisma/client';

export type ShopData = {
  marketplaceId: number;
  name: string;
  logoUrl: string;
  connectionType: ConnectionType;
  shopName: string;
  status: 'CONNECTED' | 'UNCONNECTED';
  autoDelist: boolean;
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketplaces = await db.marketplace.findMany({
    include: {
      // For each marketplace, only include shops that belong to the current user
      shops: {
        where: {
          userId: session.user.id,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  // Transform the data into a clean structure for the frontend
  const responseData: ShopData[] = marketplaces.map((mp) => {
    const connectedShop = mp.shops[0]; // There will be at most one shop per user per marketplace
    return {
      marketplaceId: mp.id,
      name: mp.name,
      logoUrl: mp.logoUrl,
      connectionType: mp.connectionType,
      status: connectedShop ? 'CONNECTED' : 'UNCONNECTED',
      shopName: connectedShop ? connectedShop.shopName : `${mp.name} Shop`,
      autoDelist: connectedShop ? connectedShop.autoDelist : false,
    };
  });

  return NextResponse.json(responseData);
}