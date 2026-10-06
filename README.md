# Tambour Achat

Tambour Achat est une application de gestion des achats de Tambour.
Celle-ci est utilisé par un artisant réalisant des achats de matérieux et encodant des commandes et émettant des factures. 

## Architecture 

### Le depot GIT

Monorepo pour un backend et un frontend

### Backend

Language Python / Django

### Frontend 

React / TypeScript / Vite, dans le dossier `frontend/`.

## Principal fonctionnalité

### Achat 

Représent un achat de matérieux ou composant à des prestataires extérieurs. 
Les achats doivent être encodées dans l'application à partir du moment où on prévoit de le faire. Nous pouvons faire évoluter à travers différents statut : 
A prévoir -> Commandé -> Reçu

A la création d'un achat, le seul statut possible est "à prévoir" et la date correspondante est mise à la date du jour. Le statut et la date sont simplement affiché et il uniquement possible de changer la date. Les autres dates ne sont tout simplement pas affichés.

#### Board de suivi des achats

Les achats sont gérer dans un tableau à plusieurs colonnes (une colonne par statut). Je peux choisir de faire un drag & drop de cette achat (sous forme de carte) d'une colonne à l'autre, et cela à pour effet d'adapter le statut et les dates correspondantes.
Bien que les dates soit visible sur les cartes, je peux décider de les adapters à la volée.
La carte doit contenir toutes les informations nécessaires.
Les cartes reçues depuis plus de 30 jours ne sont plus affichées dans le board de suivi. Cette durée est réglable dans le menu « Administration technique ». Les achats restent conservés et accessibles dans la liste « Achats ». Une date de réception future est refusée. Lors d'un retour à un statut précédent, les dates des étapes ultérieures sont effacées.

### Stock

Les stocks sont des éléments fabriqués ou des matérieux revendu. 
Ils devront évoluer selon les ventes. 

### Ventes 

Réprésente les ventes des éléments en stock le plus souvent des élements fabriqué. 

## Démarrer le backend et le frontend (Windows)

Après avoir installé une fois les dépendances backend et frontend selon les sections ci-dessous, exécutez depuis la racine du projet :

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\start-app.ps1
```

La stratégie `Bypass` ne s'applique qu'à ce processus PowerShell et ne modifie pas la stratégie enregistrée sur la machine. Le script applique les migrations Django puis ouvre le backend et le frontend dans deux fenêtres de terminal distinctes. Il utilise `.venv\Scripts\python.exe` si cet environnement existe, sinon le Python disponible dans le `PATH`. Les dépendances frontend doivent déjà être installées dans `frontend\node_modules`.

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
- `achats/` : créer et gérer les achats avec leurs lignes, dates et statuts (`planned`, `ordered`, `received`). Le statut se change avec `POST achats/{id}/transition/` et un corps `{"status":"ordered"}` (ou `planned` / `received`) ; l'API renseigne la date de l'étape et efface les dates des étapes ultérieures si l'on revient en arrière.
- `parametres-techniques/` : lire ou modifier `received_purchase_retention_days` avec `GET` ou `PUT`, dans une plage de 1 à 3 650 jours (30 jours par défaut).

La création ou la mise à jour d'un achat accepte les lignes dans le champ `lines`. Chaque ligne référence un produit et contient une quantité strictement positive et un prix unitaire positif ou nul. Le total est calculé par l'API. Pour lancer les tests : `python manage.py test`.

### Préserver les données lors des évolutions

Les migrations Django ajoutent les changements de schéma sans réinitialiser la base. Pour appliquer celles d'une nouvelle version, exécutez `python manage.py migrate` depuis `backend\` ; la migration du suivi des achats ajoute le réglage de rétention et ne supprime aucun achat existant. Les données déjà présentes, y compris les dates nulles, sont conservées.

Pour les prochaines fonctionnalités, créez et conservez les migrations (`python manage.py makemigrations`), puis appliquez-les avec `python manage.py migrate`. Ne supprimez pas `db.sqlite3` et ne supprimez ni ne modifiez les migrations déjà appliquées pour « repartir à zéro ». Avant toute évolution de schéma sur une instance qui contient des données importantes, arrêtez le serveur et faites une copie de sauvegarde de `backend\db.sqlite3`.

Cette API de développement n'est pas authentifiée. Ne pas exposer le serveur à un réseau non fiable sans ajouter l'authentification et une configuration de production.

## Démarrer le frontend

Le frontend d'administration utilise l'API Django existante. Démarrez d'abord le backend selon les étapes ci-dessus, puis dans un autre terminal :

```powershell
cd frontend
npm install
npm run dev
```

Ouvrez l'adresse locale affichée par Vite (par défaut `http://localhost:5173`). En développement, Vite transmet les requêtes `/api/` au backend sur `http://127.0.0.1:8000`. Pour cibler une autre API lors d'un build ou en prévisualisation, définissez `VITE_API_BASE_URL` vers l'URL de base de l'API, par exemple `https://example.test/api`.

L'interface permet de gérer les fournisseurs, produits et achats (y compris les lignes d'achat et les statuts). Elle n'ajoute pas d'authentification : comme l'API, elle est réservée à un usage local/de développement et ne doit pas être exposée à un réseau non fiable.
