"use client"

import { Home, CreditCard, PieChart, Settings, LogOut, Moon, Sun, PiggyBank, TrendingUp, Bitcoin, Receipt, Target, Wallet } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Transacciones",
    url: "/dashboard/transactions",
    icon: CreditCard,
  },
  {
    title: "Gastos Fijos",
    url: "/dashboard/expenses",
    icon: Receipt,
  },
  {
    title: "Presupuesto",
    url: "/dashboard/budget",
    icon: Target,
  },
  {
    title: "Efectivo",
    url: "/dashboard/cash",
    icon: Wallet,
  },
  {
    title: "Ahorros",
    url: "/dashboard/savings",
    icon: PiggyBank,
  },
  {
    title: "Inversiones",
    url: "/dashboard/investments",
    icon: TrendingUp,
  },
  {
    title: "Cripto",
    url: "/dashboard/crypto",
    icon: Bitcoin,
  },
  {
    title: "Reportes",
    url: "/dashboard/reports",
    icon: PieChart,
  },
  {
    title: "Configuración",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src="/coinpilot.png" alt="CoinPilot Logo" className="h-8 w-8" />
          <div>
            <h2 className="text-lg font-semibold">CoinPilot</h2>
            <p className="text-xs text-muted-foreground">Finanzas Personales</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>{user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.user_metadata?.full_name || user?.email}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
