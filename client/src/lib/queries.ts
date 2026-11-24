import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useState } from "react";
import { api, ApiError, type AdminProduct, type Meta, type Order, type OrderRow, type Product, type ProductDetail, type Stats, type User } from "./api";
import { clearCart } from "./cart";

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return (await api<{ user: User }>("/auth/me")).user;
      } catch (error) {
        if ((error as { status?: number }).status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });

export const useMeta = () => useQuery({ queryKey: ["meta"], queryFn: () => api<Meta>("/meta"), staleTime: Infinity });

export const useProducts = (params: URLSearchParams | string = "") =>
  useQuery({ queryKey: ["products", params.toString()], queryFn: async () => (await api<{ products: Product[] }>(`/products${params.toString() ? `?${params.toString()}` : ""}`)).products, placeholderData: keepPreviousData });

export const useProduct = (slug: string) => useQuery({ queryKey: ["product", slug], queryFn: () => api<{ product: ProductDetail; related: Product[] }>(`/products/${slug}`) });

export const useMyOrders = () => useQuery({ queryKey: ["orders", "mine"], queryFn: async () => (await api<{ orders: OrderRow[] }>("/orders")).orders });
export const useOrder = (id: string) => useQuery({ queryKey: ["order", id], queryFn: async () => (await api<{ order: Order }>(`/orders/${id}`)).order });

export const useStats = () => useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<Stats>("/admin/stats") });
export const useAdminProducts = () => useQuery({ queryKey: ["admin", "products"], queryFn: async () => (await api<{ products: AdminProduct[] }>("/admin/products")).products });
export const useAdminProduct = (id: string | undefined) => useQuery({ queryKey: ["admin", "product", id], queryFn: async () => (await api<{ product: ProductDetail }>(`/admin/products/${id}`)).product, enabled: Boolean(id) });
export const useAdminOrders = (params: URLSearchParams) =>
  useQuery({ queryKey: ["admin", "orders", params.toString()], queryFn: () => api<{ orders: OrderRow[]; total: number; page: number; pageSize: number }>(`/admin/orders?${params.toString()}`), placeholderData: keepPreviousData });

export function useSession() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enter = (user: User) => {
    client.clear();
    client.setQueryData(["me"], user);
  };
  const demo = async () => {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>("/auth/demo", { method: "POST" });
      clearCart();
      enter(user);
      navigate("/");
      window.scrollTo(0, 0);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.code : "network");
    }
    setBusy(false);
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearCart();
    client.clear();
    client.setQueryData(["me"], null);
    navigate("/");
  };
  return { demo, logout, enter, busy, error };
}
