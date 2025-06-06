import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create default categories
  const categories = [
    { name: "Comida", icon: "🍽️", color: "#ef4444" },
    { name: "Transporte", icon: "🚗", color: "#3b82f6" },
    { name: "Entretenimiento", icon: "🎬", color: "#8b5cf6" },
    { name: "Compras", icon: "🛍️", color: "#ec4899" },
    { name: "Salud", icon: "🏥", color: "#10b981" },
    { name: "Educación", icon: "📚", color: "#f59e0b" },
    { name: "Servicios", icon: "💡", color: "#6b7280" },
    { name: "Salario", icon: "💰", color: "#22c55e" },
    { name: "Freelance", icon: "💻", color: "#06b6d4" },
    { name: "Inversiones", icon: "📈", color: "#84cc16" },
    { name: "Otros Ingresos", icon: "💵", color: "#a3a3a3" },
    { name: "Otros Gastos", icon: "📦", color: "#64748b" },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }

  console.log("Categories seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
