const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    if (!admin.email) {
      await prisma.user.update({ where: { id: admin.id }, data: { email: 'admin@colegio.cl' } });
      console.log('Admin email set to admin@colegio.cl');
    } else {
      console.log('Admin already has email:', admin.email);
    }
  } else {
    console.log('No admin found');
  }
}
run();
