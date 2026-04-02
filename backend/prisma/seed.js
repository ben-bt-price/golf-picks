const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Seed 4 majors for 2026
  const majors2026 = [
    {
      name: 'Masters Tournament',
      year: 2026,
      startDate: new Date('2026-04-09'),
      endDate: new Date('2026-04-12'),
    },
    {
      name: 'PGA Championship',
      year: 2026,
      startDate: new Date('2026-05-14'),
      endDate: new Date('2026-05-17'),
    },
    {
      name: 'U.S. Open',
      year: 2026,
      startDate: new Date('2026-06-18'),
      endDate: new Date('2026-06-21'),
    },
    {
      name: 'The Open Championship',
      year: 2026,
      startDate: new Date('2026-07-16'),
      endDate: new Date('2026-07-19'),
    },
  ];

  for (const major of majors2026) {
    await prisma.major.upsert({
      where: { name_year: { name: major.name, year: major.year } },
      update: {},
      create: major,
    });
  }

  console.log('Seeded 4 majors for 2026');

  // Create default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        isSetup: true,
        isAdmin: true,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
