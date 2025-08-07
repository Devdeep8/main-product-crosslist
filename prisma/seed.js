// prisma/seed.ts
import { PrismaClient, ConnectionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Create a default user to associate shops with
  const user = await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: {},
    create: {
      email: 'testuser@example.com',
      name: 'Test User',
    },
  });
  console.log(`Created/found user: ${user.name}`);

  // Seed Marketplaces
  const marketplaces = [
    { name: 'Mercari', logoUrl: '/logos/mercari.png', connectionType: ConnectionType.BROWSER },
    { name: 'Poshmark (US)', logoUrl: '/logos/poshmark.png', connectionType: ConnectionType.BROWSER },
    { name: 'Poshmark (CA)', logoUrl: '/logos/poshmark.png', connectionType: ConnectionType.BROWSER },
    { name: 'Depop', logoUrl: '/logos/depop.png', connectionType: ConnectionType.BROWSER },
    { name: 'Grailed', logoUrl: '/logos/grailed.png', connectionType: ConnectionType.BROWSER },
    { name: 'Facebook', logoUrl: '/logos/facebook.png', connectionType: ConnectionType.BROWSER },
    { name: 'Etsy', logoUrl: '/logos/etsy.png', connectionType: ConnectionType.BROWSER },
    { name: 'eBay', logoUrl: '/logos/ebay.png', connectionType: ConnectionType.API },
  ];

  for (const mp of marketplaces) {
    await prisma.marketplace.upsert({
      where: { name: mp.name },
      update: {},
      create: mp,
    });
  }
  console.log(`Seeded ${marketplaces.length} marketplaces.`);

  // Seed some connected shops for the test user to match the UI
  const depopMarketplace = await prisma.marketplace.findUnique({ where: { name: 'Depop' } });
  const etsyMarketplace = await prisma.marketplace.findUnique({ where: { name: 'Etsy' } });
  const ebayMarketplace = await prisma.marketplace.findUnique({ where: { name: 'eBay' } });

  if (depopMarketplace) {
    await prisma.shop.upsert({
        where: { userId_marketplaceId: { userId: user.id, marketplaceId: depopMarketplace.id } },
        update: {},
        create: { userId: user.id, marketplaceId: depopMarketplace.id, shopName: 'developerdeepapi', status: 'CONNECTED' },
    });
  }
  if (etsyMarketplace) {
     await prisma.shop.upsert({
        where: { userId_marketplaceId: { userId: user.id, marketplaceId: etsyMarketplace.id } },
        update: {},
        create: { userId: user.id, marketplaceId: etsyMarketplace.id, shopName: 'Etsy Shop', status: 'CONNECTED' },
    });
  }
  if (ebayMarketplace) {
     await prisma.shop.upsert({
        where: { userId_marketplaceId: { userId: user.id, marketplaceId: ebayMarketplace.id } },
        update: {},
        create: { userId: user.id, marketplaceId: ebayMarketplace.id, shopName: 'develope-62', status: 'CONNECTED', autoDelist: true },
    });
  }
   console.log(`Seeded connected shops for test user.`);

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });