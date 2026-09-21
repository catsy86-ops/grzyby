import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Lewy pasek akcentu koloru per typ toastu, ta sama 4-stopniowa skala co
          // EdibilityBadge.tsx/edibilityCardAccentClass (green/yellow/red) - dotąd `--normal-bg`
          // był tokenowy, ale każdy typ toastu wyglądał identycznie, bez wizualnego rozróżnienia
          // sukcesu od ostrzeżenia/błędu na pierwszy rzut oka. `richColors` świadomie pominięte
          // (nadpisałoby całe tło twardymi kolorami zamiast tego subtelnego akcentu).
          success: "border-l-4 border-l-green-500 [&_[data-icon]]:text-green-600 dark:[&_[data-icon]]:text-green-500",
          warning: "border-l-4 border-l-yellow-500 [&_[data-icon]]:text-yellow-600 dark:[&_[data-icon]]:text-yellow-500",
          error: "border-l-4 border-l-red-600 [&_[data-icon]]:text-red-600 dark:[&_[data-icon]]:text-red-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
