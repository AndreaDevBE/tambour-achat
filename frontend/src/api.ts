import type {
  Product,
  ProductWrite,
  Purchase,
  PurchaseStatus,
  PurchaseWrite,
  Supplier,
  SupplierWrite,
  TechnicalSettings,
} from "./types";

const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractError(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractError);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) =>
      extractError(nested).map((message) =>
        key === "detail" || /^\d+$/.test(key) ? message : `${key} : ${message}`,
      ),
    );
  }
  return [];
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body) headers.set("Content-Type", "application/json");
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      "Impossible de joindre l’API. Vérifiez que le serveur Django est démarré.",
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const messages = extractError(body);
    throw new ApiError(
      messages.length > 0
        ? messages.join(" · ")
        : `La requête a échoué (HTTP ${response.status}).`,
      response.status,
    );
  }

  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  const body: unknown = await response.json();
  return body as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  await send(path, init);
}

function collectionPath(resource: string): string {
  return `/${resource}/`;
}

function itemPath(resource: string, id: number): string {
  return `${collectionPath(resource)}${id}/`;
}

export const api = {
  listSuppliers: () => request<Supplier[]>(collectionPath("fournisseurs")),
  saveSupplier: (data: SupplierWrite, id?: number) =>
    request<Supplier>(id ? itemPath("fournisseurs", id) : collectionPath("fournisseurs"), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: number) =>
    requestVoid(itemPath("fournisseurs", id), { method: "DELETE" }),

  listProducts: () => request<Product[]>(collectionPath("produits")),
  saveProduct: (data: ProductWrite, id?: number) =>
    request<Product>(id ? itemPath("produits", id) : collectionPath("produits"), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: number) =>
    requestVoid(itemPath("produits", id), { method: "DELETE" }),

  listPurchases: () => request<Purchase[]>(collectionPath("achats")),
  savePurchase: (data: PurchaseWrite, id?: number) =>
    request<Purchase>(id ? itemPath("achats", id) : collectionPath("achats"), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    }),
  transitionPurchase: (id: number, status: PurchaseStatus) =>
    request<Purchase>(`${itemPath("achats", id)}transition/`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  updatePurchaseDate: (
    id: number,
    date: Partial<Pick<Purchase, "planned_date" | "ordered_date" | "received_date">>,
  ) =>
    request<Purchase>(itemPath("achats", id), {
      method: "PATCH",
      body: JSON.stringify(date),
    }),
  deletePurchase: (id: number) =>
    requestVoid(itemPath("achats", id), { method: "DELETE" }),

  getTechnicalSettings: () =>
    request<TechnicalSettings>("/parametres-techniques/"),
  saveTechnicalSettings: (data: TechnicalSettings) =>
    request<TechnicalSettings>("/parametres-techniques/", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
