import { api } from './api';
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  MenuResponse,
  OrderApi,
  OrderResponse,
} from '@/types/menu';

export async function fetchMenu(): Promise<MenuResponse> {
  const res = await api.get<MenuResponse>('/public/menu');
  return res.data;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  const res = await api.post<CreateOrderResponse>('/public/orders', payload);
  return res.data;
}

export async function fetchOrder(id: string): Promise<OrderResponse> {
  const res = await api.get<OrderResponse>(`/public/orders/${id}`);
  return res.data;
}

export async function cancelOrder(id: string): Promise<{ order: OrderApi }> {
  const res = await api.post<{ order: OrderApi }>(`/public/orders/${id}/cancel`);
  return res.data;
}
