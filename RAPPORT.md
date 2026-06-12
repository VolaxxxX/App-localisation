# 📋 Rapport final — GeoShare

## 1. Choix techniques

### Expo + React Native + TypeScript
Un seul code source pour iOS et Android, builds cloud **gratuits** via EAS,
mises à jour OTA, et typage strict de bout en bout (chaque accès base de
données passe par les types de `types/index.ts`). Le projet réutilise des
patterns durcis en production : chargement **paresseux** de `firebase/auth`
(évite un écran blanc silencieux sur certaines configs RN), `metro.config.js`
forçant la résolution du bundle React Native de Firebase, et polyfill
`react-native-get-random-values` chargé en tout premier.

### Firebase Realtime Database plutôt que Firestore
Le partage de position produit un flux continu de petites écritures. RTDB :
- diffuse les changements en **quelques centaines de ms** (objectif < 2 s
  largement tenu) ;
- facture au **volume** (négligeable pour des coordonnées) plutôt qu'au
  document lu/écrit ;
- fournit `onDisconnect`, parfait pour une **présence** fiable sans serveur.

### Carte : OpenStreetMap (Leaflet dans une WebView)
Choix dicté par la contrainte « gratuité maximale » : **aucune clé API**, aucun
compte Google Cloud, rendu **identique sur iOS et Android**, et — avantage clé —
**fonctionne dans Expo Go** (contrairement aux modules de carte natifs). Les
marqueurs personnalisés (bulle colorée + avatar emoji) sont dessinés en HTML/CSS
via `L.divIcon`. La communication RN ↔ page se fait par `injectJavaScript`
(markers, recentrage, fit) et `postMessage` (taps, handshake « ready »).
*Compromis assumé* : performance de rendu légèrement inférieure à une carte
native pour de très grands volumes de marqueurs — négligeable ici.

### Architecture
- **Couche données isolée** (`lib/database.ts`) : toutes les lectures/écritures
  et abonnements temps réel y sont centralisés et typés.
- **Contextes** : `AuthProvider` (session + profil temps réel) et
  `TrackingProvider` (un **unique** pipeline GPS pour toute l'app — évite des
  watchers concurrents).
- **Hooks** : `useContacts` (agrège profil + position + présence par contact,
  avec gestion fine des abonnements ajoutés/retirés) et `useLocationTracking`
  (permissions, watcher, background, throttling, écriture).
- **Séparation tâche d'arrière-plan** : `firebase-auth.ts` initialise l'auth de
  façon **idempotente** pour que la tâche headless puisse écrire en base en
  passant les règles de sécurité.

## 2. Optimisations

- **Batterie** : cadence et déplacement minimal plus élevés en arrière-plan
  (8 s / 15 m) qu'au premier plan (2 s / 3 m) ; lecture batterie toutes les 60 s.
- **Réseau** : écritures **throttlées** (~2 s) et points trop imprécis (> 100 m)
  rejetés pour ne pas polluer la carte ni gaspiller de la bande passante.
- **Rendu carte** : `tracksViewChanges` activé brièvement puis désactivé — les
  marqueurs s'affichent correctement sur Android sans redessin permanent.
- **Abonnements ciblés** : on n'écoute que les `locations/$uid` des contacts
  réellement liés, et les abonnements sont nettoyés dès qu'un lien disparaît.
- **Démarrage** : un point « last known » seed la carte immédiatement, puis le
  watcher haute précision prend le relais.
- **Robustesse offline** : timeouts de sécurité pour ne jamais rester bloqué sur
  un spinner si la base ne répond pas (cold start hors-ligne).

## 3. Sécurité

- Position et présence **lisibles uniquement** par les contacts explicitement
  liés (règle `connections/$uid/$reader` exists).
- Écritures réservées au propriétaire (`auth.uid === $uid`).
- Codes de liaison non devinables (alphabet sans caractères ambigus), réservés
  atomiquement, et **rotables** (l'ancien code est invalidé).
- La clé API Firebase Web est publique par conception : la protection réelle
  vient des règles RTDB, pas du secret de la clé.

## 4. Gestion des erreurs (cas limites couverts)

| Cas | Comportement |
|---|---|
| Permission GPS refusée | Bannière + bouton « Ouvrir les réglages » |
| GPS désactivé | Bannière « GPS désactivé » + bouton « Réessayer » |
| Réseau absent / perte | Écritures retentées au prochain échantillon ; présence → hors ligne |
| Démarrage hors-ligne | Timeouts de sécurité débloquent l'UI |
| Code inexistant / soi-même / déjà lié | Messages d'erreur dédiés et localisés |
| Échec d'écriture profil à l'inscription | Rollback du compte Auth orphelin |
| Marqueurs Android vides | Corrigé via `tracksViewChanges` temporisé |

## 5. Limites connues

- La **localisation en arrière-plan** (téléphone verrouillé) nécessite un
  **development build** (module natif de tâche) ; la carte, l'auth, les contacts
  et la localisation au premier plan fonctionnent dans **Expo Go**.
- La carte OSM charge **Leaflet via CDN** (unpkg) et les tuiles OpenStreetMap :
  une connexion réseau est requise (comme toute carte en ligne). Pour un usage
  100 % hors-réseau, il faudrait empaqueter Leaflet et un cache de tuiles.
- Pour de **très grands groupes** de marqueurs, une carte native serait plus
  fluide ; un clustering Leaflet suffirait à mitiger.
- L'écriture **en arrière-plan app totalement tuée** dépend de la restauration
  de la session Firebase dans le contexte headless ; gérée via
  `waitForAuthReady`, mais soumise aux limitations OS d'économie d'énergie
  (surtout sur certains Android constructeurs agressifs type Xiaomi/Huawei).
- Photos de profil : implémentées en **avatars emoji** (zéro coût de stockage) ;
  l'upload de vraies photos nécessiterait Firebase Storage.
- Les credentials Firebase sont des **placeholders** : l'app nécessite la
  configuration décrite dans le README avant de tourner.

## 6. Améliorations futures

- Historique des trajets (itinéraire / heatmap) avec rétention configurable.
- Zones / géofencing (« arrivé à la maison ») + notifications push associées.
- Partage temporaire (lien expirant après N heures).
- Chiffrement de bout en bout des coordonnées.
- Connexion Google / Apple en plus de l'e-mail.
- Clustering des marqueurs pour les grands groupes.
- Tests automatisés (Jest + React Native Testing Library) et E2E (Maestro).

## 7. État de validation

```
tsc --noEmit ............... 0 erreur
expo install --check ....... versions OK (SDK 54)
expo-doctor ................ 18/18 checks passés
expo export (android) ...... 1595 modules, OK
expo export (ios) .......... OK
```
