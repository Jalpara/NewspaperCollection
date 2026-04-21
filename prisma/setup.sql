PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "flatNo" TEXT,
  "buildingName" TEXT,
  "address" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Newspaper" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL UNIQUE,
  "basePrice" REAL NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CustomerNewspaper" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customerId" INTEGER NOT NULL,
  "newspaperId" INTEGER NOT NULL,
  "customPrice" REAL,
  "deliveryDays" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNewspaper_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerNewspaper_newspaperId_fkey" FOREIGN KEY ("newspaperId") REFERENCES "Newspaper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Bill" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customerId" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "totalAmount" REAL NOT NULL,
  "previousBalance" REAL NOT NULL DEFAULT 0,
  "grandTotal" REAL NOT NULL,
  "billNote" TEXT,
  "qrPayload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unpaid',
  "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customerId" INTEGER NOT NULL,
  "billId" INTEGER,
  "amount" REAL NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'upi',
  "paymentNote" TEXT,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'recorded',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Transaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "role" TEXT NOT NULL,
  "adminUserId" TEXT,
  "customerId" INTEGER,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuthSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CustomerOtp" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customerId" INTEGER,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerOtp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerNewspaper_customerId_newspaperId_key" ON "CustomerNewspaper"("customerId", "newspaperId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bill_customerId_month_year_key" ON "Bill"("customerId", "month", "year");
CREATE INDEX IF NOT EXISTS "Newspaper_active_idx" ON "Newspaper"("active");
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_active_idx" ON "Customer"("active");
CREATE INDEX IF NOT EXISTS "CustomerNewspaper_customerId_active_idx" ON "CustomerNewspaper"("customerId", "active");
CREATE INDEX IF NOT EXISTS "Bill_month_year_status_idx" ON "Bill"("month", "year", "status");
CREATE INDEX IF NOT EXISTS "Bill_customerId_year_month_idx" ON "Bill"("customerId", "year", "month");
CREATE INDEX IF NOT EXISTS "Transaction_customerId_timestamp_idx" ON "Transaction"("customerId", "timestamp");
CREATE INDEX IF NOT EXISTS "Transaction_billId_timestamp_idx" ON "Transaction"("billId", "timestamp");
CREATE INDEX IF NOT EXISTS "AuthSession_token_idx" ON "AuthSession"("token");
CREATE INDEX IF NOT EXISTS "AuthSession_role_expiresAt_idx" ON "AuthSession"("role", "expiresAt");
CREATE INDEX IF NOT EXISTS "CustomerOtp_phone_expiresAt_idx" ON "CustomerOtp"("phone", "expiresAt");
