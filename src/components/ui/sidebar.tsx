// src/components/ui/sidebar.tsx
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'; // Importuri necesare
import { Menu } from 'lucide-react'; // Pentru butonul de trigger pe mobil

// Context pentru starea sidebar-ului (colapsat/extins)
interface SidebarContextProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  isSheetOpen: boolean;
  setIsSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
};

// Provider
export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false); // Pentru controlul Sheet-ului

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Când se trece de la mobil la desktop și sheet-ul era deschis, închide-l.
  React.useEffect(() => {
    if (!isMobile && isSheetOpen) {
      setIsSheetOpen(false);
    }
  }, [isMobile, isSheetOpen]);


  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobile, isSheetOpen, setIsSheetOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};


// Componenta principală Sidebar
const sidebarVariants = cva(
  'hidden md:flex md:flex-col transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-30 border-r bg-background',
  {
    variants: {
      collapsed: {
        true: 'w-16 hover:w-60 group data-[collapsible=icon]:w-16',
        false: 'w-60 group-data-[collapsible=true]:w-60',
      },
    },
    defaultVariants: {
      collapsed: false,
    },
  }
);

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sidebarVariants> {
  collapsibleType?: 'icon' | 'full'; // 'icon' = se colapsează la iconițe, 'full' = se colapsează complet (neimplementat încă)
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    const { isCollapsed, isMobile, setIsSheetOpen, isSheetOpen } = useSidebar();

    if (isMobile) {
      return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          {/* Trigger-ul va fi în SidebarTrigger, dar Sheet-ul e definit aici */}
          <SheetContent side="left" className="w-60 p-0 flex flex-col"> {/* Asigură-te că SheetContent are padding 0 dacă sub-componentele gestionează padding-ul */}
            <SheetHeader className="p-4 border-b"> {/* ADAUGAT SheetHeader */}
              <SheetTitle>Meniu Navigare</SheetTitle> {/* ADAUGAT SheetTitle */}
            </SheetHeader>
            {/* Conținutul sidebar-ului va fi randat aici (copii) */}
            {/* Este important ca SidebarHeader, Content, Footer (de la Sidebar, nu Sheet) să fie adaptate */}
            <div className="flex flex-col h-full">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(sidebarVariants({ collapsed: isCollapsed }), className)}
        data-collapsible={isCollapsed ? 'icon' : 'full'}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Sidebar.displayName = 'Sidebar';

// Componenta SidebarTrigger (pentru butonul de pe mobil)
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, setIsSheetOpen } = useSidebar();
    if (!isMobile) return null;

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("md:hidden", className)} // Afișat doar pe mobil
        onClick={() => setIsSheetOpen(true)}
        aria-label="Deschide meniul"
        {...props}
      >
        {children || <Menu className="h-6 w-6" />}
      </Button>
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";


// Componenta SidebarHeader
export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isCollapsed, isMobile } = useSidebar();
    if (isMobile) { // Nu randa header-ul separat în sheet dacă e gestionat de SheetHeader deja
      // return null; // Sau dacă vrei să-l incluzi în SheetContent
    }
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-5 border-b',
          isCollapsed && !isMobile ? 'px-2 group-hover:px-4 transition-all duration-300 ease-in-out' : '',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SidebarHeader.displayName = 'SidebarHeader';

// Componenta SidebarContent
export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-y-auto overflow-x-hidden', className)} {...props}>
      {children}
    </div>
  )
);
SidebarContent.displayName = 'SidebarContent';

// Componenta SidebarFooter
export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isCollapsed, isMobile } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-4 border-t mt-auto', // mt-auto pentru a împinge footer-ul în jos
          isCollapsed && !isMobile ? 'px-2 group-hover:px-4 transition-all duration-300 ease-in-out' : '',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SidebarFooter.displayName = 'SidebarFooter';

// Componenta SidebarMenu
export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, children, ...props }, ref) => (
    <ul ref={ref} className={cn('space-y-1 px-2 py-2', className)} {...props}>
      {children}
    </ul>
  )
);
SidebarMenu.displayName = 'SidebarMenu';

// Componenta SidebarMenuItem (un li)
export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, children, ...props }, ref) => (
    <li ref={ref} className={cn('', className)} {...props}>
      {children}
    </li>
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";


// Componenta SidebarMenuButton (un Button stilizat pentru meniu)
interface SidebarMenuButtonProps extends ButtonProps {
  tooltip?: string;
  isActive?: boolean;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, children, tooltip, isActive, variant = 'ghost', size = 'sm', ...props }, ref) => {
    const { isCollapsed, isMobile } = useSidebar();

    const buttonContent = (
      <Button
        ref={ref}
        variant={isActive ? 'secondary' : variant}
        size={size}
        className={cn(
          'w-full justify-start gap-2',
          isCollapsed && !isMobile ? 'group-hover:justify-start justify-center px-0 group-hover:px-2' : '',
          className
        )}
        {...props}
      >
        {/* Children sunt iconița și textul */}
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && typeof child.type !== 'string') { // Iconița
            return React.cloneElement(child as React.ReactElement<any>, {
              className: cn(child.props.className, 'h-4 w-4'),
            });
          }
          if (index === 1) { // Textul (al doilea copil)
            return <span className={cn(isCollapsed && !isMobile ? 'hidden group-hover:inline' : '')}>{child}</span>;
          }
          return child;
        })}
      </Button>
    );

    if (isCollapsed && !isMobile && tooltip) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={10}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return buttonContent;
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

// Componenta SidebarInset (pentru conținutul principal al paginii, lângă sidebar)
export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, isCollapsed } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col flex-1 transition-all duration-300 ease-in-out',
          !isMobile && (isCollapsed ? 'md:ml-16' : 'md:ml-60'), // Ajustează margin-left pe desktop
          isMobile && 'ml-0', // Fără margin-left pe mobil (Sheet-ul se ocupă)
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SidebarInset.displayName = "SidebarInset";