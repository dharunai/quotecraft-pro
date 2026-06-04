import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-white group-[.toaster]:border-slate-800 group-[.toaster]:shadow-md group-[.toaster]:rounded-full group-[.toaster]:py-1.5 group-[.toaster]:px-4 group-[.toaster]:min-h-0 group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-1.5 group-[.toaster]:text-[11px] group-[.toaster]:font-semibold",
          title: "group-[.toast]:text-[11px] group-[.toast]:font-bold",
          description: "group-[.toast]:text-[11px] group-[.toast]:text-slate-300",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-slate-950 group-[.toast]:text-[10px] group-[.toast]:rounded-full group-[.toast]:px-2 group-[.toast]:py-0.5",
          cancelButton:
            "group-[.toast]:bg-slate-850 group-[.toast]:text-white group-[.toast]:text-[10px] group-[.toast]:rounded-full group-[.toast]:px-2 group-[.toast]:py-0.5",
          success: "group-[.toast]:bg-emerald-600 group-[.toast]:border-emerald-500 group-[.toast]:text-white",
          error: "group-[.toast]:bg-red-600 group-[.toast]:border-red-500 group-[.toast]:text-white",
          warning: "group-[.toast]:bg-amber-600 group-[.toast]:border-amber-500 group-[.toast]:text-white",
          info: "group-[.toast]:bg-blue-600 group-[.toast]:border-blue-500 group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
