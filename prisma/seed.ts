import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  MONTHLY_DELIVERY_FEE,
  countDeliveryDatesForMonth,
  generateBillNote,
  getBillQrPayload,
  roundCurrency,
} from "../src/lib/billing";
import { createPasswordHash } from "../src/lib/auth";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? "admin1234";
  const adminUsername = process.env.ADMIN_DEFAULT_USERNAME ?? "admin";

  const admin = await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: {
      name: "Billing Admin",
      passwordHash: await createPasswordHash(adminPassword),
    },
    create: {
      username: adminUsername,
      name: "Billing Admin",
      passwordHash: await createPasswordHash(adminPassword),
    },
  });

  const newspapers = await Promise.all(
    [
      { name: "The Hindu", basePrice: 230 },
      { name: "Times of India", basePrice: 210 },
      { name: "Economic Times", basePrice: 320 },
      { name: "Business Line", basePrice: 280 },
      { name: "Sunday Sports", basePrice: 120 },
    ].map((item) =>
      prisma.newspaper.upsert({
        where: { name: item.name },
        update: item,
        create: item,
      }),
    ),
  );

  const customerA = await prisma.customer.upsert({
    where: { phone: "9876543210" },
    update: {
      name: "Rajesh Kumar",
      flatNo: "A-302",
      buildingName: "MG Residency",
      address: "21 MG Road, Bengaluru",
      active: true,
    },
    create: {
      name: "Rajesh Kumar",
      phone: "9876543210",
      flatNo: "A-302",
      buildingName: "MG Residency",
      address: "21 MG Road, Bengaluru",
      active: true,
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { phone: "9123456780" },
    update: {
      name: "Anita Sharma",
      flatNo: "B-108",
      buildingName: "Lake View Colony",
      address: "8 Lake View Colony, Bengaluru",
      active: true,
    },
    create: {
      name: "Anita Sharma",
      phone: "9123456780",
      flatNo: "B-108",
      buildingName: "Lake View Colony",
      address: "8 Lake View Colony, Bengaluru",
      active: true,
    },
  });

  await prisma.customerNewspaper.upsert({
    where: {
      customerId_newspaperId: {
        customerId: customerA.id,
        newspaperId: newspapers[0].id,
      },
    },
    update: {
      deliveryDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      customPrice: null,
      active: true,
    },
    create: {
      customerId: customerA.id,
      newspaperId: newspapers[0].id,
      deliveryDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      active: true,
    },
  });

  await prisma.customerNewspaper.upsert({
    where: {
      customerId_newspaperId: {
        customerId: customerA.id,
        newspaperId: newspapers[2].id,
      },
    },
    update: {
      deliveryDays: "Mon,Fri",
      customPrice: null,
      active: true,
    },
    create: {
      customerId: customerA.id,
      newspaperId: newspapers[2].id,
      deliveryDays: "Mon,Fri",
      active: true,
    },
  });

  await prisma.customerNewspaper.upsert({
    where: {
      customerId_newspaperId: {
        customerId: customerB.id,
        newspaperId: newspapers[1].id,
      },
    },
    update: {
      deliveryDays: "Mon,Tue,Wed,Thu,Fri,Sat",
      customPrice: null,
      active: true,
    },
    create: {
      customerId: customerB.id,
      newspaperId: newspapers[1].id,
      deliveryDays: "Mon,Tue,Wed,Thu,Fri,Sat",
      active: true,
    },
  });

  const month = 3;
  const year = 2026;
  const amountA = roundCurrency(
    newspapers[0].basePrice * countDeliveryDatesForMonth("Mon,Tue,Wed,Thu,Fri,Sat,Sun", month, year) +
      newspapers[2].basePrice * countDeliveryDatesForMonth("Mon,Fri", month, year) +
      MONTHLY_DELIVERY_FEE,
  );
  const previousBalanceA = 150;

  await prisma.bill.upsert({
    where: {
      customerId_month_year: {
        customerId: customerA.id,
        month,
        year,
      },
    },
    update: {},
    create: {
      customerId: customerA.id,
      month,
      year,
      totalAmount: amountA,
      previousBalance: previousBalanceA,
      grandTotal: roundCurrency(amountA + previousBalanceA),
      billNote: generateBillNote(
        {
          name: customerA.name,
          flatNo: customerA.flatNo,
          buildingName: customerA.buildingName,
        },
        month,
        year,
      ),
      qrPayload: getBillQrPayload({
        customer: {
          name: customerA.name,
          flatNo: customerA.flatNo,
          buildingName: customerA.buildingName,
        },
        month,
        year,
        grandTotal: roundCurrency(amountA + previousBalanceA),
      }),
      status: "partial",
    },
  });

  await prisma.bill.upsert({
    where: {
      customerId_month_year: {
        customerId: customerB.id,
        month,
        year,
      },
    },
    update: {
      totalAmount: 180 + MONTHLY_DELIVERY_FEE,
      previousBalance: 0,
      grandTotal: 180 + MONTHLY_DELIVERY_FEE,
      billNote: generateBillNote(
        {
          name: customerB.name,
          flatNo: customerB.flatNo,
          buildingName: customerB.buildingName,
        },
        month,
        year,
      ),
      qrPayload: getBillQrPayload({
        customer: {
          name: customerB.name,
          flatNo: customerB.flatNo,
          buildingName: customerB.buildingName,
        },
        month,
        year,
        grandTotal: 180 + MONTHLY_DELIVERY_FEE,
      }),
      status: "paid",
      paidAt: new Date(`${year}-${String(month).padStart(2, "0")}-18T09:30:00.000Z`),
    },
    create: {
      customerId: customerB.id,
      month,
      year,
      totalAmount: 180 + MONTHLY_DELIVERY_FEE,
      previousBalance: 0,
      grandTotal: 180 + MONTHLY_DELIVERY_FEE,
      billNote: generateBillNote(
        {
          name: customerB.name,
          flatNo: customerB.flatNo,
          buildingName: customerB.buildingName,
        },
        month,
        year,
      ),
      qrPayload: getBillQrPayload({
        customer: {
          name: customerB.name,
          flatNo: customerB.flatNo,
          buildingName: customerB.buildingName,
        },
        month,
        year,
        grandTotal: 180 + MONTHLY_DELIVERY_FEE,
      }),
      status: "paid",
      paidAt: new Date(`${year}-${String(month).padStart(2, "0")}-18T09:30:00.000Z`),
    },
  });

  const billA = await prisma.bill.findUniqueOrThrow({
    where: {
      customerId_month_year: {
        customerId: customerA.id,
        month,
        year,
      },
    },
  });

  const billB = await prisma.bill.findUniqueOrThrow({
    where: {
      customerId_month_year: {
        customerId: customerB.id,
        month,
        year,
      },
    },
  });

  await prisma.transaction.deleteMany({
    where: {
      paymentNote: {
        in: ["Partial payment received", "Full cash payment received and marked paid"],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      customerId: customerA.id,
      billId: billA.id,
      amount: 100,
      paymentMethod: "upi",
      status: "recorded",
      paymentNote: "Partial payment received",
    },
  });

  await prisma.transaction.create({
    data: {
      customerId: customerB.id,
      billId: billB.id,
      amount: billB.grandTotal,
      paymentMethod: "cash",
      status: "confirmed",
      paymentNote: "Full cash payment received and marked paid",
      timestamp: new Date(`${year}-${String(month).padStart(2, "0")}-18T09:30:00.000Z`),
    },
  });

  console.log(
    `Seeded admin ${admin.username} / ${adminPassword} and sample customers ${customerA.id}, ${customerB.id}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
