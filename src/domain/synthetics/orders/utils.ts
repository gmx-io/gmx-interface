import { OrdersData } from "./types";

export function getOrders(ordersData: OrdersData) {
  return Object.values(ordersData);
}

export function getOrder(ordersData: OrdersData, orderKey?: string) {
  if (!orderKey) return undefined;

  return ordersData[orderKey];
}
