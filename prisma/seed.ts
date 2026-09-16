import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/passwords";

// Seeds the test admin account and demo products required by
// PROJECT-REQUIREMENTS.md: one admin, and three products including at
// least one draft and one published. Idempotent (safe to re-run) via
// upsert on the admin email and product slugs.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin12345";

async function main() {
  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);
  await prisma.adminUser.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: SEED_ADMIN_EMAIL, passwordHash },
  });

  await prisma.product.upsert({
    where: { slug: "wireless-mouse" },
    update: {},
    create: {
      slug: "wireless-mouse",
      name: "Wireless Mouse M1",
      characteristics: [
        { label: "Colour", value: "Black" },
        { label: "Connection", value: "Bluetooth 5.0" },
        { label: "Battery life", value: "18 months" },
      ],
      description:
        "A compact wireless mouse with a silent click and a battery that lasts well over a year on a single charge.",
      seoTitle: "Wireless Mouse M1 — silent click, long battery life",
      seoDescription:
        "Buy the Wireless Mouse M1: silent clicks, Bluetooth 5.0, and up to 18 months of battery life.",
      status: "PUBLISHED",
    },
  });

  await prisma.product.upsert({
    where: { slug: "mechanical-keyboard" },
    update: {},
    create: {
      slug: "mechanical-keyboard",
      name: "Mechanical Keyboard K2",
      characteristics: [
        { label: "Switch type", value: "Brown tactile" },
        { label: "Layout", value: "TKL" },
        { label: "Backlight", value: "RGB" },
      ],
      description:
        "A tenkeyless mechanical keyboard with tactile brown switches and per-key RGB lighting.",
      seoTitle: "Mechanical Keyboard K2 — tactile switches, RGB",
      seoDescription:
        "Draft listing for the Mechanical Keyboard K2 — not yet published.",
      status: "DRAFT",
    },
  });

  await prisma.product.upsert({
    where: { slug: "usb-c-hub" },
    update: {},
    create: {
      slug: "usb-c-hub",
      name: "USB-C Hub 7-in-1",
      characteristics: [
        { label: "Ports", value: "HDMI, 3x USB-A, SD, microSD, USB-C PD" },
        { label: "Max resolution", value: "4K @ 60Hz" },
      ],
      description:
        "A 7-in-1 USB-C hub that adds HDMI, USB-A, and card reader ports to a single USB-C port.",
      seoTitle: "USB-C Hub 7-in-1 — HDMI 4K, USB-A, SD card reader",
      seoDescription:
        "USB-C Hub 7-in-1: HDMI up to 4K@60Hz, three USB-A ports, and an SD/microSD card reader.",
      status: "PUBLISHED",
    },
  });

  console.log(`Seeded admin user: ${SEED_ADMIN_EMAIL}`);
  console.log("Seeded 3 demo products (2 published, 1 draft).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
