"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Bell, LogOut, User, Settings, Instagram } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from '@/utils/supabase/client';
import Sidebar from "@/app/components/Sidebar";
import NavigationBottomBar from "@/app/components/NavigationBottomBar";

const navItems = [
  { name: "Home", href: "/dashboard/", icon: Home },
  { name: "Search", href: "/dashboard/search", icon: Search },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

// Helper function to truncate email
const truncateEmail = (email: string, maxLength: number = 20) => {
  if (!email) return '';
  if (email.length <= maxLength) return email;

  const [username, domain] = email.split('@');
  if (!domain) return email.slice(0, maxLength) + '...';

  const truncatedEmail = email.slice(0, maxLength - 3) + '...'; // -3 for '...'
  return truncatedEmail;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string; image?: string } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      if (supabaseUser && !error) {
        setUser({
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name,
          image: supabaseUser.user_metadata?.avatar_url
        });
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.name,
          image: session.user.user_metadata?.avatar_url
        });
      } else {
        setUser(null);
      }
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Assuming 768px is the breakpoint for mobile
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Update the dropdown menu content to use truncated email
  const dropdownContent = (
    <DropdownMenuContent align="end" className="w-56 bg-background-white text-primary dark:text-primary-white">
      <DropdownMenuLabel>
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">{user?.name || "Account"}</p>
          <p className="text-xs leading-none text-primary-medium dark:text-primary-white">
            {user?.email ? truncateEmail(user.email) : "user@example.com"}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-secondary-sage dark:bg-primary-white" />
      <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
        <User className="mr-2 h-4 w-4" />
        <span>Profile</span>
      </DropdownMenuItem>
      {/* <DropdownMenuItem>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
      </DropdownMenuItem> */}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className="bg-background-white dark:bg-primary text-primary dark:text-primary-white">
      {isMobile ? (
        // Mobile view
        <>
          <div className="fixed inset-0 flex flex-col w-screen">
            <div className="h-[calc(100vh-5rem)] overflow-y-auto">
              {children}
            </div>
            <NavigationBottomBar user={user} dropdownContent={dropdownContent} />
          </div>
        </>
      ) : (
        // Desktop view
        <>
          <div className="flex h-screen">
            <Sidebar user={user} dropdownContent={dropdownContent} />
            <div className="flex-grow overflow-y-auto">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}