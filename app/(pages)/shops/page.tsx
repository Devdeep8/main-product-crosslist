// app/dashboard/shops/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { type ShopData } from '@/app/api/shops/route'; // Import the type

export default function MyShopsPage() {
  const [shops, setShops] = useState<ShopData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/shops');
        if (!response.ok) {
          throw new Error('Failed to fetch shops');
        }
        const data: ShopData[] = await response.json();
        setShops(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShops();
  }, []);

  const browserShops = shops.filter((s) => s.connectionType === 'BROWSER');
  const apiShops = shops.filter((s) => s.connectionType === 'API');
  
  const ShopTable = ({ title, shopsList }: { title: string; shopsList: ShopData[] }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Marketplace</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Auto Delist</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shopsList.map((shop) => (
              <TableRow key={shop.marketplaceId}>
                <TableCell className="font-medium flex items-center gap-2">
                  <img src={shop.logoUrl} alt={shop.name} className="h-5 w-5 rounded-full" />
                  {shop.name}
                </TableCell>
                <TableCell>{shop.shopName}</TableCell>
                <TableCell>
                  <Badge variant={shop.status === 'CONNECTED' ? 'success' : 'destructive'}>
                    {shop.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={shop.autoDelist} disabled={shop.status === 'UNCONNECTED'} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div>Loading shops...</div>; // You can replace this with a nice skeleton loader
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 md:p-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Shops</h1>
        <Button>Connect All</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShopTable title="Browser Login Status for My Shops" shopsList={browserShops} />
        <ShopTable title="API Connection Status for My Shops" shopsList={apiShops} />
      </div>
    </motion.div>
  );
}