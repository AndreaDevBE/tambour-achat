import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, api } from "./api";
import type {
  Product,
  ProductWrite,
  Purchase,
  PurchaseLineWrite,
  PurchaseStatus,
  PurchaseWrite,
  Supplier,
  SupplierWrite,
} from "./types";

type Section = "achats" | "fournisseurs" | "produits";
type Data = {
  fournisseurs: Supplier[];
  produits: Product[];
  achats: Purchase[];
};
type FormResult =
  | { section: "fournisseurs"; payload: SupplierWrite }
  | { section: "produits"; payload: ProductWrite }
  | { section: "achats"; payload: PurchaseWrite };
type EditTarget = {
  section: Section;
  item: Supplier | Product | Purchase | null;
};

const sectionLabels: Record<Section, string> = {
  achats: "Achats",
  fournisseurs: "Fournisseurs",
  produits: "Produits",
};

const itemLabels: Record<Section, string> = {
  achats: "Achat",
  fournisseurs: "Fournisseur",
  produits: "Produit",
};

const statusLabels: Record<PurchaseStatus, string> = {
  planned: "À prévoir",
  ordered: "Commandé",
  received: "Reçu",
};

const emptyData: Data = { fournisseurs: [], produits: [], achats: [] };

function formatMoney(value: string | number): string {
  return `${new Intl.NumberFormat("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))} €`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-BE").format(
    new Date(year, month - 1, day),
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Une erreur inattendue est survenue.";
}

export default function App() {
  const [section, setSection] = useState<Section>("achats");
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [saveError, setSaveError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fournisseurs, produits, achats] = await Promise.all([
        api.listSuppliers(),
        api.listProducts(),
        api.listPurchases(),
      ]);
      setData({ fournisseurs, produits, achats });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openForm(target: EditTarget) {
    setSaveError("");
    setEditTarget(target);
  }

  async function saveForm(result: FormResult): Promise<boolean> {
    setSaveError("");
    try {
      if (result.section === "fournisseurs") {
        await api.saveSupplier(
          result.payload,
          editTarget?.item?.id,
        );
      } else if (result.section === "produits") {
        await api.saveProduct(result.payload, editTarget?.item?.id);
      } else {
        await api.savePurchase(result.payload, editTarget?.item?.id);
      }
      setEditTarget(null);
      setNotice(`${itemLabels[result.section]} enregistré.`);
      await loadData();
      return true;
    } catch (saveFailure) {
      setSaveError(getErrorMessage(saveFailure));
      return false;
    }
  }

  async function deleteItem(targetSection: Section, id: number, label: string) {
    if (!window.confirm(`Supprimer « ${label} » ? Cette action est définitive.`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      if (targetSection === "fournisseurs") await api.deleteSupplier(id);
      else if (targetSection === "produits") await api.deleteProduct(id);
      else await api.deletePurchase(id);
      setNotice(`${itemLabels[targetSection]} supprimé.`);
      await loadData();
    } catch (deleteFailure) {
      setError(getErrorMessage(deleteFailure));
    }
  }

  function actions(targetSection: Section, id: number, label: string) {
    return (
      <div className="row-actions">
        <button
          aria-label={`Modifier ${label}`}
          className="button button-quiet"
          onClick={() =>
            openForm({
              section: targetSection,
              item:
                targetSection === "achats"
                  ? data.achats.find((item) => item.id === id) ?? null
                  : targetSection === "produits"
                    ? data.produits.find((item) => item.id === id) ?? null
                    : data.fournisseurs.find((item) => item.id === id) ?? null,
            })
          }
          type="button"
        >
          Modifier
        </button>
        <button
          className="button button-danger-quiet"
          onClick={() => void deleteItem(targetSection, id, label)}
          type="button"
        >
          Supprimer
        </button>
      </div>
    );
  }

  const count = data[section].length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span aria-hidden="true" className="brand-mark">T</span>
          <span>
            <strong>Tambour</strong>
            <small>Gestion des achats</small>
          </span>
        </a>
        <p className="nav-heading">GESTION</p>
        <nav aria-label="Navigation principale" className="main-nav">
          {(["achats", "fournisseurs", "produits"] as Section[]).map(
            (item, index) => (
              <button
                aria-current={section === item ? "page" : undefined}
                className={`nav-link ${section === item ? "active" : ""}`}
                key={item}
                onClick={() => {
                  setSection(item);
                  setNotice("");
                }}
                type="button"
              >
                <span aria-hidden="true" className="nav-number">
                  0{index + 1}
                </span>
                {sectionLabels[item]}
                {item === "achats" && data.achats.length > 0 && (
                  <span className="nav-count">{data.achats.length}</span>
                )}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="connection-dot" />
          <span>Mode local · API Django</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">ESPACE DE GESTION</p>
            <h1>{sectionLabels[section]}</h1>
            <p className="page-description">
              {section === "achats" && "Suivez vos commandes, de la prévision à la réception."}
              {section === "fournisseurs" && "Retrouvez et gérez vos partenaires d’approvisionnement."}
              {section === "produits" && "Gérez les matériaux et composants que vous achetez."}
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => openForm({ section, item: null })}
            type="button"
          >
            <span aria-hidden="true">+</span> Ajouter {section === "achats" ? "un achat" : section === "produits" ? "un produit" : "un fournisseur"}
          </button>
        </header>

        <div className="page-meta">
          <span>{count} {count === 1 ? "élément" : "éléments"}</span>
          <span className="meta-divider" />
          <span>Synchronisé avec l’API</span>
        </div>

        {notice && (
          <div className="notice success" role="status">
            {notice}
            <button aria-label="Fermer le message" onClick={() => setNotice("")} type="button">×</button>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            <span>{error}</span>
            <button className="button button-quiet" onClick={() => void loadData()} type="button">
              Actualiser la liste
            </button>
          </div>
        )}

        <section aria-label={`Liste des ${sectionLabels[section].toLowerCase()}`} className="data-panel">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" />
              <p>Chargement des données…</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">!</div>
              <h2>Connexion à l’API impossible</h2>
              <p>Démarrez le serveur Django, puis réessayez.</p>
            </div>
          ) : count === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">＋</div>
              <h2>Aucun {section === "achats" ? "achat" : section === "produits" ? "produit" : "fournisseur"}</h2>
              <p>Ajoutez votre premier élément pour le retrouver ici.</p>
              <button
                className="button button-secondary"
                onClick={() => openForm({ section, item: null })}
                type="button"
              >
                Ajouter {section === "achats" ? "un achat" : section === "produits" ? "un produit" : "un fournisseur"}
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              {section === "fournisseurs" && (
                <table>
                  <thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Notes</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {data.fournisseurs.map((supplier) => (
                      <tr key={supplier.id}>
                        <td className="primary-cell">{supplier.name}</td>
                        <td>{supplier.email || "—"}</td>
                        <td>{supplier.phone || "—"}</td>
                        <td className="truncate-cell">{supplier.notes || "—"}</td>
                        <td>{actions("fournisseurs", supplier.id, supplier.name)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {section === "produits" && (
                <table>
                  <thead><tr><th>Nom</th><th>Référence</th><th>Unité</th><th>Description</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {data.produits.map((product) => (
                      <tr key={product.id}>
                        <td className="primary-cell">{product.name}</td>
                        <td>{product.reference || "—"}</td>
                        <td>{product.unit}</td>
                        <td className="truncate-cell">{product.description || "—"}</td>
                        <td>{actions("produits", product.id, product.name)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {section === "achats" && (
                <table>
                  <thead><tr><th>Achat</th><th>Fournisseur</th><th>Date prévue</th><th>Articles</th><th>Statut</th><th>Total</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {data.achats.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="primary-cell">#{purchase.id}</td>
                        <td>{purchase.supplier_name}</td>
                        <td>{formatDate(purchase.planned_date)}</td>
                        <td>{purchase.lines.length}</td>
                        <td><span className={`status-badge status-${purchase.status}`}>{statusLabels[purchase.status]}</span></td>
                        <td className="amount-cell">{formatMoney(purchase.total)}</td>
                        <td>{actions("achats", purchase.id, `Achat #${purchase.id}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
        <p className="security-note">
          Interface de développement sans authentification. Ne pas exposer à un réseau non fiable.
        </p>
      </main>

      {editTarget && (
        <EntityForm
          error={saveError}
          initial={editTarget.item}
          onClose={() => setEditTarget(null)}
          onSave={saveForm}
          products={data.produits}
          section={editTarget.section}
          suppliers={data.fournisseurs}
        />
      )}
    </div>
  );
}

interface EntityFormProps {
  section: Section;
  initial: Supplier | Product | Purchase | null;
  suppliers: Supplier[];
  products: Product[];
  error: string;
  onClose: () => void;
  onSave: (result: FormResult) => Promise<boolean>;
}

interface PurchaseLineForm {
  product: string;
  quantity: string;
  unit_price: string;
}

function EntityForm({
  section,
  initial,
  suppliers,
  products,
  error,
  onClose,
  onSave,
}: EntityFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [supplier, setSupplier] = useState<SupplierWrite>(() =>
    initial && "email" in initial
      ? { name: initial.name, email: initial.email, phone: initial.phone, notes: initial.notes }
      : { name: "", email: "", phone: "", notes: "" },
  );
  const [product, setProduct] = useState<ProductWrite>(() =>
    initial && "reference" in initial
      ? { name: initial.name, reference: initial.reference, unit: initial.unit, description: initial.description }
      : { name: "", reference: "", unit: "pièce", description: "" },
  );
  const [purchase, setPurchase] = useState<PurchaseWrite>(() => {
    const existing = initial && "supplier_name" in initial ? initial : null;
    return {
      supplier: existing?.supplier ?? (suppliers[0]?.id ?? 0),
      status: existing?.status ?? "planned",
      planned_date: existing?.planned_date ?? "",
      ordered_date: existing?.ordered_date ?? "",
      received_date: existing?.received_date ?? "",
      notes: existing?.notes ?? "",
      lines: existing?.lines.map(({ product: productId, quantity, unit_price }) => ({
        product: productId,
        quantity,
        unit_price,
      })) ?? [{ product: products[0]?.id ?? 0, quantity: "1", unit_price: "0.00" }],
    };
  });

  const editing = initial !== null;

  function updateLine(index: number, key: keyof PurchaseLineForm, value: string) {
    setPurchase((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex !== index
          ? line
          : key === "product"
            ? { ...line, product: Number(value) }
            : key === "quantity"
              ? { ...line, quantity: value }
              : { ...line, unit_price: value },
      ),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      let succeeded = false;
      if (section === "fournisseurs") {
        succeeded = await onSave({ section, payload: supplier });
      } else if (section === "produits") {
        succeeded = await onSave({ section, payload: product });
      } else {
        if (purchase.lines.length === 0) return;
        const lines: PurchaseLineWrite[] = purchase.lines.map((line) => ({
          product: Number(line.product),
          quantity: line.quantity,
          unit_price: line.unit_price,
        }));
        succeeded = await onSave({
          section,
          payload: {
            ...purchase,
            supplier: Number(purchase.supplier),
            planned_date: purchase.planned_date || null,
            ordered_date: purchase.ordered_date || null,
            received_date: purchase.received_date || null,
            lines,
          },
        });
      }
      if (succeeded) onClose();
    } finally {
      setIsSaving(false);
    }
  }

  function changeLine(index: number, key: keyof PurchaseLineForm, value: string) {
    updateLine(index, key, value);
  }

  const noun = section === "achats" ? "achat" : section === "produits" ? "produit" : "fournisseur";

  return (
    <div className="modal-backdrop">
      <section aria-labelledby="form-title" aria-modal="true" className="modal" role="dialog">
        <header className="modal-header">
          <div>
            <p className="eyebrow">{sectionLabels[section].toUpperCase()}</p>
            <h2 id="form-title">{editing ? "Modifier" : "Ajouter"} {noun}</h2>
          </div>
          <button aria-label="Fermer" className="icon-button" onClick={onClose} type="button">×</button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <div className="modal-body">
            {error && <div className="notice error" role="alert">{error}</div>}
            {section === "fournisseurs" && (
              <div className="form-grid">
                <label className="field field-full">
                  Nom <span className="required">*</span>
                  <input autoFocus maxLength={200} onChange={(event) => setSupplier({ ...supplier, name: event.target.value })} required value={supplier.name} />
                </label>
                <label className="field">
                  E-mail
                  <input maxLength={254} onChange={(event) => setSupplier({ ...supplier, email: event.target.value })} type="email" value={supplier.email} />
                </label>
                <label className="field">
                  Téléphone
                  <input maxLength={50} onChange={(event) => setSupplier({ ...supplier, phone: event.target.value })} value={supplier.phone} />
                </label>
                <label className="field field-full">
                  Notes
                  <textarea onChange={(event) => setSupplier({ ...supplier, notes: event.target.value })} rows={3} value={supplier.notes} />
                </label>
              </div>
            )}
            {section === "produits" && (
              <div className="form-grid">
                <label className="field field-full">
                  Nom <span className="required">*</span>
                  <input autoFocus maxLength={200} onChange={(event) => setProduct({ ...product, name: event.target.value })} required value={product.name} />
                </label>
                <label className="field">
                  Référence
                  <input maxLength={100} onChange={(event) => setProduct({ ...product, reference: event.target.value })} value={product.reference} />
                </label>
                <label className="field">
                  Unité <span className="required">*</span>
                  <input maxLength={50} onChange={(event) => setProduct({ ...product, unit: event.target.value })} required value={product.unit} />
                </label>
                <label className="field field-full">
                  Description
                  <textarea onChange={(event) => setProduct({ ...product, description: event.target.value })} rows={3} value={product.description} />
                </label>
              </div>
            )}
            {section === "achats" && (
              <div className="form-grid">
                <label className="field field-full">
                  Fournisseur <span className="required">*</span>
                  <select onChange={(event) => setPurchase({ ...purchase, supplier: Number(event.target.value) })} required value={purchase.supplier || ""}>
                    <option disabled value="">Choisir un fournisseur</option>
                    {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {suppliers.length === 0 && <span className="field-hint">Créez d’abord un fournisseur.</span>}
                </label>
                <label className="field">
                  Statut
                  <select onChange={(event) => {
                    const value = event.target.value;
                    if (value === "planned" || value === "ordered" || value === "received") {
                      setPurchase({ ...purchase, status: value });
                    }
                  }} value={purchase.status}>
                    <option value="planned">À prévoir</option>
                    <option value="ordered">Commandé</option>
                    <option value="received">Reçu</option>
                  </select>
                </label>
                <label className="field">
                  Date prévue
                  <input onChange={(event) => setPurchase({ ...purchase, planned_date: event.target.value })} type="date" value={purchase.planned_date ?? ""} />
                </label>
                <label className="field">
                  Date de commande
                  <input onChange={(event) => setPurchase({ ...purchase, ordered_date: event.target.value })} type="date" value={purchase.ordered_date ?? ""} />
                </label>
                <label className="field">
                  Date de réception
                  <input onChange={(event) => setPurchase({ ...purchase, received_date: event.target.value })} type="date" value={purchase.received_date ?? ""} />
                </label>
                <div className="field field-full">
                  <div className="line-heading">
                    <span>Lignes d’achat <span className="required">*</span></span>
                    <button
                      className="button button-quiet"
                      disabled={products.length === 0}
                      onClick={() => setPurchase((current) => ({
                        ...current,
                        lines: [...current.lines, { product: products[0].id, quantity: "1", unit_price: "0.00" }],
                      }))}
                      type="button"
                    >
                      + Ajouter une ligne
                    </button>
                  </div>
                  {products.length === 0 && <span className="field-hint">Créez d’abord un produit.</span>}
                  <div className="purchase-lines">
                    {purchase.lines.map((line, index) => (
                      <div className="purchase-line" key={index}>
                        <label className="field line-product">
                          Produit
                          <select onChange={(event) => changeLine(index, "product", event.target.value)} required value={line.product || ""}>
                            <option disabled value="">Choisir un produit</option>
                            {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </label>
                        <label className="field line-quantity">
                          Quantité
                          <input min="0.001" onChange={(event) => changeLine(index, "quantity", event.target.value)} required step="0.001" type="number" value={line.quantity} />
                        </label>
                        <label className="field line-price">
                          Prix unitaire (€)
                          <input min="0" onChange={(event) => changeLine(index, "unit_price", event.target.value)} required step="0.01" type="number" value={line.unit_price} />
                        </label>
                        <button
                          aria-label={`Supprimer la ligne ${index + 1}`}
                          className="icon-button remove-line"
                          disabled={purchase.lines.length === 1}
                          onClick={() => setPurchase((current) => ({
                            ...current,
                            lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
                          }))}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <label className="field field-full">
                  Notes
                  <textarea onChange={(event) => setPurchase({ ...purchase, notes: event.target.value })} rows={3} value={purchase.notes} />
                </label>
              </div>
            )}
          </div>
          <footer className="modal-footer">
            <button className="button button-quiet" onClick={onClose} type="button">Annuler</button>
            <button className="button button-primary" disabled={isSaving || (section === "achats" && (suppliers.length === 0 || products.length === 0))} type="submit">
              {isSaving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
