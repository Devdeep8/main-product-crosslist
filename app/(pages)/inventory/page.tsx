// app/dashboard/inventory/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal } from 'lucide-react';
import { Prisma } from '@prisma/client';
import Link from 'next/link';

// Define a detailed type for our product data, including relations
type ProductWithListings = Prisma.ProductGetPayload<{
  include: {
    listings: {
      include: {
        shop: {
          include: {
            marketplace: true;
          };
        };
      };
    };
  };
}>;

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithListings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch inventory');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) {
    return <div className="p-6">Loading Inventory...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            A list of all products in your inventory.
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/add">Add Product</Link>
        </Button>
      </header>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Listed On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img
                      // @ts-ignore
                      src={product.imagesJson?.urls?.[0] || 'https://via.placeholder.com/150'}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.listings.map((listing) => (
                        <img
                          key={listing.id}
                          src={listing.shop.marketplace.logoUrl}
                          alt={listing.shop.marketplace.name}
                          title={listing.shop.marketplace.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No products in inventory.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}