"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Home,
  Warehouse,
  ListTodo,
  ClipboardList,
  Store,
  User,
  HelpCircle,
  Wind,
  LogOut,
  Settings,
  ToolCase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { Separator } from "../ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
const navLinks = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/tools/converter", label: "Tools", icon: ToolCase },
  { href: "/shops", label: "My Shops", icon: Store },
  { href: "/account", label: "Account", icon: User },
];

export function HomeHeader({ session }: { session: any }) {
  const pathname = usePathname();
  const user = session.user;

  return (
<header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-6 
  backdrop-blur-md  dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 shadow-sm">      {/* Left Section: Logo and App Name */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <LayoutGrid className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Wind className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-800 dark:text-white">
            Cross-listing
          </span>
        </Link>
      </div>

      {/* Center Section: Navigation Links */}
      <nav className=" hidden md:flex items-center gap-2 "> 

      {navLinks.map((link) => {
  const isActive = pathname.startsWith(link.href);
  return (
    <Tooltip key={link.href}>
      <TooltipTrigger asChild>
        <Link href={link.href}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className="flex items-center gap-2"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {link.label}
      </TooltipContent>
    </Tooltip>
  );
})}
      </nav>



      {/* Right Section: Help and User Dropdown */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help
        </Button>

        {/* Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage
                src={user?.image || "https://github.com/shadcn.png"}
                alt={user?.name || "@user"}
              />
              <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium truncate">
                  {user?.name || "Unknown User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <Separator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <User className="mr-2 h-4 w-4 text-primary" />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4 text-primary" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex justify-start cursor-pointer text-destructive w-full dark:hover:bg-red-900"
              asChild
            >
              <Button variant="link" size="default" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4 text-primary" />
                Logout
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
