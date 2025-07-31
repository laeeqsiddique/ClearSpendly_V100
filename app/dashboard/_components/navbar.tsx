"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import UserProfile from "@/components/user-profile";
import {
  HomeIcon,
  MessageCircleIcon,
  Receipt,
  Settings,
  Upload,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardTopNav({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <header className="flex h-14 lg:h-[52px] items-center gap-4 border-b px-3">
        <Dialog>
          <SheetTrigger className="min-[1024px]:hidden p-2 transition">
            <Link prefetch={true} href="/dashboard">
              <span className="sr-only">Home</span>
            </Link>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <Link prefetch={true} href="/" className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-purple-600" />
                <SheetTitle>Flowvya</SheetTitle>
              </Link>
            </SheetHeader>
            <div className="flex flex-col space-y-3 mt-[1rem]">
              <DialogClose asChild>
                <Link prefetch={true} href="/dashboard">
                  <Button variant="outline" className="w-full">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    Overview
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link prefetch={true} href="/dashboard/chat">
                  <Button variant="outline" className="w-full">
                    <MessageCircleIcon className="mr-2 h-4 w-4" />
                    Chat
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link prefetch={true} href="/dashboard/upload">
                  <Button variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link prefetch={true} href="/dashboard/payment">
                  <Button variant="outline" className="w-full">
                    <Banknote className="mr-2 h-4 w-4" />
                    Payment Gated
                  </Button>
                </Link>
              </DialogClose>
              <Separator className="my-3" />
              <DialogClose asChild>
                <Link prefetch={true} href="/dashboard/settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </DialogClose>
            </div>
          </SheetContent>
        </Dialog>
        <div className="flex justify-center items-center gap-2 ml-auto">
          <UserProfile mini={true} />
        </div>
      </header>
      {children}
    </div>
  );
}
