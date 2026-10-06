# Tambour Achat

Tambour Achat est une application de gestion des achats de Tambour.
Celle-ci est utilisé par un artisant réalisant des achats de matérieux et encodant des commandes et émettant des factures. 

## Architecture 

### Le depot GIT

Monorepo pour un backend et un frontend

### Backend

Language Python / Django

### Frontend 

Language Python / Framework de ton choix

## Principal fonctionnalité

### Achat 

Représent un achat de matérieux ou composant à des prestataires extérieurs. 
Les achats doivent être encodées dans l'application à partir du moment où on prévoit de le faire. Nous pouvons faire évoluter à travers différents statut : 
- A prévoir
- Commandé
- Reçu 

### Stock

Les stocks sont des éléments fabriqués ou des matérieux revendu. 
Ils devront évoluer selon les ventes. 

### Ventes 

Réprésente les ventes des éléments en stock le plus souvent des élements fabriqué. 

## Démarrer le backend

Le backend est dans le dossier `backend/`. Il utilise Django, Django REST Framework et SQLite.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

L'API JSON est disponible sous `http://127.0.0.1:8000/api/` :

- `fournisseurs/` : créer et gérer les fournisseurs.
- `produits/` : créer et gérer les produits achetables.
- `achats/` : créer et gérer les achats avec leurs lignes, dates et statuts (`planned`, `ordered`, `received`).

La création ou la mise à jour d'un achat accepte les lignes dans le champ `lines`. Chaque ligne référence un produit et contient une quantité strictement positive et un prix unitaire positif ou nul. Le total est calculé par l'API. Pour lancer les tests : `python manage.py test`.

Cette API de développement n'est pas authentifiée. Ne pas exposer le serveur à un réseau non fiable sans ajouter l'authentification et une configuration de production.
