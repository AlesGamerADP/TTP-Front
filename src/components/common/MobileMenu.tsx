'use client';

import { useState } from 'react';
import { Menu, X, User, LogOut, Plus, Package, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Separator } from '../ui/separator';
import type { User as UserType } from '../../lib/auth';

interface MobileMenuProps {
  user: UserType;
  onLogout: () => void;
  onIngressClick?: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function MobileMenu({
  user,
  onLogout,
  onIngressClick,
  title,
  subtitle,
  icon
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  const handleIngressClick = () => {
    setOpen(false);
    onIngressClick?.();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'user_manager': return 'Gestor';
      case 'admin': return 'Admin';
      case 'interno': return 'Interno';
      default: return role;
    }
  };

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-auto min-w-[44px]"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5 app-brand-text" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="px-4 pt-6 pb-4 border-b">
            <SheetTitle className="app-brand-text text-lg">Menú</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-6 px-4 pb-4">
            {/* User Info */}
            <div className="mobile-menu-user-card flex items-center gap-3 p-3 rounded-lg">
              <div className="app-brand-icon w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="app-brand-text font-medium truncate text-sm">
                  {user.codigo}
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {/* New Ingress button - only for internal users */}
              {onIngressClick && user.role === 'interno' && (
                <Button
                  onClick={handleIngressClick}
                  className="header-action-button header-action-button--warning w-full justify-start font-semibold text-sm min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Ingreso
                </Button>
              )}

              {/* Logout button */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="header-action-button header-action-button--danger w-full justify-start font-medium text-white text-sm min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

