import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { 
  Loader2, 
  User, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  LogOut,
  FileText,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface UserInfo {
  id: string;
  name: string;
  image?: string | null | undefined;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function UserProfile({ mini }: { mini?: boolean }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.getSession();

      if (!result.data?.user) {
        router.push("/sign-in");
        return;
      }

      setUserInfo(result.data?.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user profile. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in"); // redirect to login page
        },
      },
    });
  };

  if (error) {
    return (
      <div
        className={`flex gap-2 justify-start items-center w-full rounded ${mini ? "" : "px-4 pt-2 pb-3"}`}
      >
        <div className="text-red-500 text-sm flex-1">
          {mini ? "Error" : error}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={`flex gap-2 justify-start items-center w-full rounded ${mini ? "" : "px-4 pt-2 pb-3"}`}
        >
          <Avatar>
            {loading ? (
              <div className="flex items-center justify-center w-full h-full">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {userInfo?.image ? (
                  <AvatarImage src={userInfo?.image} alt="User Avatar" />
                ) : (
                  <AvatarFallback>
                    {userInfo?.name && userInfo.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </>
            )}
          </Avatar>
          {mini ? null : (
            <div className="flex items-center gap-2">
              <p className="font-medium text-md">
                {loading ? "Loading..." : userInfo?.name || "User"}
              </p>
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2 py-2">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                {userInfo?.image ? (
                  <AvatarImage src={userInfo?.image} alt="User Avatar" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold">
                    {userInfo?.name && userInfo.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-gray-900 dark:text-gray-100">
                  {userInfo?.name || "User"}
                </p>
                <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                  {userInfo?.email || ""}
                </p>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/admin">
            <DropdownMenuItem className="cursor-pointer">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 mr-3">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Profile</span>
                  <span className="text-xs text-gray-500">Manage your account</span>
                </div>
              </div>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/admin">
            <DropdownMenuItem className="cursor-pointer">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 mr-3">
                  <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Settings</span>
                  <span className="text-xs text-gray-500">Preferences & config</span>
                </div>
              </div>
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-3">
                <HelpCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Help & Support</span>
                <span className="text-xs text-gray-500">Get help when you need it</span>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20 mr-3">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Log out</span>
              <span className="text-xs text-red-500">Sign out of your account</span>
            </div>
          </div>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
