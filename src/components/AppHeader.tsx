"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import CurrencySelector from "@/components/CurrencySelector";

interface AppHeaderProps {
  onNewTransaction?: () => void;
}

export default function AppHeader ({ onNewTransaction }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className='glass backdrop-blur-xl border-b-2 border-primary/30 sticky top-0 z-50 scan-line-effect shadow-lg'>
      <div className='max-w-[1600px] mx-auto px-6 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Link href='/' className='mono text-lg font-bold tracking-tight hover:text-primary transition-colors'>
              <span className='text-primary'>&gt;</span> FINANCIAL_TERMINAL
              <span className='text-primary animate-pulse'>_</span>
            </Link>
          </div>
          <div className='flex items-center space-x-2'>
            {onNewTransaction && (
              <Button
                onClick={onNewTransaction}
                className='mono text-xs font-bold tracking-wider terminal-border bg-primary hover:bg-primary/90'
              >
                [+] NEW_TXN
              </Button>
            )}
            <Link
              href='/'
              className={`mono text-xs px-3 py-2 rounded border transition-all duration-200 ${
                pathname === "/"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary hover:text-primary"
              }`}
            >
              HOME
            </Link>
            <Link
              href='/import'
              className={`mono text-xs px-3 py-2 rounded border transition-all duration-200 ${
                pathname === "/import"
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border hover:border-secondary hover:text-secondary"
              }`}
            >
              IMPORT
            </Link>
            <Link
              href='/admin'
              className={`mono text-xs px-3 py-2 rounded border transition-all duration-200 ${
                pathname === "/admin"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-accent hover:text-accent"
              }`}
            >
              ADMIN
            </Link>
            <div className='border-l border-border/50 pl-2' />
            <CurrencySelector />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 ring-2 ring-primary hover:ring-secondary transition-all",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
