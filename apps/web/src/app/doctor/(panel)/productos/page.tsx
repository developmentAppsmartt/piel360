"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShoppingBag, FolderOpen, Sparkles } from "lucide-react";
import { CategoriesTab } from "@/components/products/categories-tab";
import { ProductsTab } from "@/components/products/products-tab";
import { SuggestedProductsTab } from "@/components/treatments/suggested-products-tab";
import { ApiError } from "@/lib/api-error";
import { useProductCategories } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

type Tab = "categorias" | "productos" | "sugeridos";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "categorias",
    label: "Categorías",
    icon: <FolderOpen className="size-4" />,
  },
  {
    id: "productos",
    label: "Productos",
    icon: <ShoppingBag className="size-4" />,
  },
  {
    id: "sugeridos",
    label: "Sugeridos por puntaje",
    icon: <Sparkles className="size-4" />,
  },
];

export default function ProductosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("categorias");
  // Usamos categories para detectar 401 global
  const { error } = useProductCategories();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/doctor/login");
    }
  }, [error, router]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Productos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona las categorías y productos que recomiendas a tus pacientes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === "categorias" && <CategoriesTab />}
      {activeTab === "productos" && <ProductsTab />}
      {activeTab === "sugeridos" && <SuggestedProductsTab />}
    </div>
  );
}
