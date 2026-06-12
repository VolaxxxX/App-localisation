# 📍 GeoShare — Partage de position en temps réel (iOS & Android)

Application mobile **React Native / Expo** permettant à plusieurs personnes de
partager leur position GPS **en temps réel** sur une carte commune, avec un
système de **codes de liaison**, du suivi **en arrière-plan**, la **présence**
en ligne/hors ligne, le **niveau de batterie** et une **sécurité stricte** :
chacun ne voit que la position des contacts auxquels il est explicitement lié.

> iPhone + Android, 100 % cross-platform, backend **gratuit** (Firebase).

---

## ✨ Fonctionnalités

- 🔐 **Authentification** e-mail / mot de passe (Firebase Auth, session persistée)
- 🔗 **Liaison par code** : chaque utilisateur a un code unique à 6 caractères ;
  on rejoint quelqu'un en entrant son code. **Liaison multiple** supportée.
- 🗺️ **Carte temps réel** (Apple Maps sur iOS, Google Maps sur Android)
  - marqueurs personnalisés : prénom, avatar emoji, couleur
  - batterie, dernière mise à jour, distance, précision GPS
- 🟢 **Présence** en ligne / hors ligne (via `onDisconnect` Firebase)
- 📡 **Suivi en arrière-plan** (téléphone verrouillé) optimisé batterie
- 🎯 **GPS haute précision** avec filtrage des points imprécis
- 🛡️ **Règles de sécurité** : position lisible uniquement par les contacts liés
- 🌍 **i18n** français / anglais (détection automatique)
- 🌗 **Thème clair / sombre** automatique

---

## 🧱 Stack technique & justification

| Besoin | Choix | Pourquoi |
|---|---|---|
| App cross-platform | **Expo + React Native + TypeScript** | un seul code iOS/Android, builds gratuits via EAS, OTA updates, typage complet |
| Temps réel | **Firebase Realtime Database** | latence < 1 s, idéal pour des positions à haute fréquence ; `onDisconnect` natif pour la présence ; quota gratuit généreux ; bien moins cher que Firestore pour des écritures fréquentes éphémères |
| Auth | **Firebase Auth** (email/password) | gratuit, sécurisé, persistance AsyncStorage |
| Carte | **react-native-maps** | Apple Maps sur iOS (aucune clé requise), Google Maps sur Android |
| GPS / arrière-plan | **expo-location + expo-task-manager** | permissions gérées, foreground-service Android, background iOS |
| Batterie | **expo-battery** | niveau + état de charge |

**Pourquoi RTDB plutôt que Firestore ?** Le partage de position génère
beaucoup de petites écritures continues. RTDB facture au volume de données
(très faible ici) et diffuse les changements en quelques centaines de
millisecondes, là où Firestore facture par document lu/écrit — plus coûteux et
légèrement plus lent pour ce profil d'usage.

---

## 🗂️ Architecture du projet

```
App-localisation/
├── app/                          # Routes (expo-router, file-based)
│   ├── _layout.tsx               # Providers racine + splash
│   ├── index.tsx                 # Redirection (splash → auth ou app)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Connexion
│   │   └── register.tsx          # Inscription
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Barre d'onglets + TrackingProvider
│   │   ├── map.tsx               # 🗺️ Carte temps réel (écran principal)
│   │   ├── contacts.tsx          # 👥 Liste des contacts
│   │   └── profile.tsx           # ⚙️ Profil + paramètres
│   └── (modals)/
│       ├── _layout.tsx
│       └── add-contact.tsx       # Ajouter / rejoindre un contact
├── components/                   # UI réutilisable
│   ├── Avatar.tsx  Badges.tsx  Button.tsx  Input.tsx
│   ├── Screen.tsx  States.tsx  MarkerBubble.tsx  ContactCard.tsx
├── hooks/
│   ├── useContacts.ts            # Agrège contacts (profil+position+présence)
│   └── useLocationTracking.ts    # Pipeline GPS de l'utilisateur
├── lib/
│   ├── firebase.ts               # Init app + RTDB
│   ├── firebase-auth.ts          # Init auth idempotente (app + tâche bg)
│   ├── auth-context.tsx          # Contexte d'authentification
│   ├── database.ts               # Toute la couche d'accès aux données
│   ├── location-service.ts       # Permissions + watchers + background
│   ├── location-task.ts          # Tâche d'arrière-plan (TaskManager)
│   ├── presence.ts               # Présence onDisconnect
│   ├── tracking-context.tsx      # Une seule instance de tracking
│   ├── notifications.ts          # Push (optionnel)
│   ├── i18n.ts  useT.ts          # Traductions FR/EN
│   ├── useColors.ts  format.ts  auth-errors.ts  constants.ts
├── constants/Colors.ts           # Palette + thèmes clair/sombre
├── types/index.ts                # Types du domaine
├── assets/                       # Icônes & splash
├── database.rules.json           # Règles de sécurité RTDB
├── firebase.json                 # Config déploiement règles
├── app.json  eas.json            # Config Expo / EAS
└── google-services.json          # Config Android Firebase (placeholder)
```

---

## 🗄️ Schéma de la base de données (Realtime Database)

```
users/$uid
  displayName: string
  email: string | null
  avatar: string            # emoji
  color: "#RRGGBB"          # couleur du marqueur
  shareCode: "ABC123"       # code de liaison (6 car.)
  sharingEnabled: bool
  language: "fr" | "en"
  pushToken?: string
  createdAt: number

codes/$CODE = $uid          # index code → utilisateur (unicité + résolution)

connections/$uid/$contactUid = { since: number }   # liens MUTUELS

locations/$uid
  lat, lng: number
  accuracy, altitude, speed, heading: number | null
  battery: number | null    # 0..1
  charging: bool
  updatedAt: number

presence/$uid
  state: "online" | "offline"
  lastChanged: number
```

### Modèle de liens

Quand **B** entre le code de **A**, on écrit **les deux** arêtes
`connections/A/B` et `connections/B/A`. La visibilité est donc **réciproque** :
A et B se voient mutuellement. Un même code peut être utilisé par plusieurs
personnes → liaisons multiples.

### Sécurité (extrait de `database.rules.json`)

- `users/$uid` : écriture réservée au propriétaire.
- `locations/$uid` : **lecture autorisée uniquement** si le lecteur figure dans
  `connections/$uid` (ou est le propriétaire) ; écriture réservée au
  propriétaire.
- `presence/$uid` : même logique de lecture restreinte.
- `codes/$CODE` : un code ne peut pointer que vers son propre `uid`.

Résultat : **personne ne peut lire la position d'un utilisateur sans être un
contact lié.**

---

## 🔄 Flux temps réel

1. Le device acquiert sa position (foreground : `watchPositionAsync` haute
   précision ; background : tâche `expo-task-manager` + foreground-service).
2. Les échantillons sont filtrés (précision > 100 m rejetée) et **throttlés**
   (~2 s) puis écrits dans `locations/$uid`.
3. Chaque contact s'abonne à `locations/$contactUid` via `onValue` → mise à
   jour de la carte en **temps réel** (typiquement < 1 s).
4. La présence est maintenue par `onDisconnect` : le serveur marque l'utilisateur
   hors ligne dès que la connexion tombe.

---

## 🚀 Installation pas à pas

### Prérequis
- Node.js 18+
- `npm install -g eas-cli` (pour les builds)
- L'app **Expo Go** (iOS/Android) pour tester en développement
- Un compte **Firebase** (gratuit)

### 1. Cloner & installer
```bash
npm install
```

### 2. Configurer Firebase
1. Crée un projet sur https://console.firebase.google.com
2. **Authentication → Sign-in method → Email/Password : Activer**
3. **Realtime Database → Créer une base** (mode verrouillé)
4. Déploie les règles de sécurité :
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # sélectionne ton projet
   firebase deploy --only database
   ```
   (ou copie-colle `database.rules.json` dans l'onglet *Règles* de la console)
5. **Project Settings → Tes apps → Web** : copie la config et remplace les
   placeholders dans **`lib/firebase.ts`**.
6. **Android** : ajoute une app Android (package `com.geoshare.app`),
   télécharge le vrai `google-services.json` et remplace le placeholder.
7. **Carte Android** : crée une clé *Maps SDK for Android* dans Google Cloud et
   colle-la dans `app.json` → `android.config.googleMaps.apiKey`.
   *(iOS utilise Apple Maps, aucune clé nécessaire.)*

### 3. Lancer en développement
```bash
npx expo start
```
> ⚠️ `react-native-maps` et la localisation en arrière-plan ne fonctionnent
> **pas** dans Expo Go : pour les tester il faut un **development build**
> (`eas build --profile development`). Le reste de l'app tourne dans Expo Go.

---

## 📦 Build (iOS & Android)

```bash
eas login

# Android — APK installable directement
eas build -p android --profile preview

# Android — bundle Play Store
eas build -p android --profile production

# iOS — nécessite un compte Apple Developer (99 $/an)
eas build -p ios --profile preview
```

Le workflow GitHub Actions `.github/workflows/build-android.yml` déclenche
automatiquement un build Android (secret `EXPO_TOKEN` requis).

---

## 🧪 Vérifications effectuées

- ✅ `tsc --noEmit` — typage strict, **0 erreur**
- ✅ `expo install --check` — versions alignées sur le SDK 54
- ✅ `expo-doctor` — **18/18 checks** passés
- ✅ `expo export` (iOS **et** Android) — bundles générés sans erreur
- ✅ Permissions iOS & Android déclarées (foreground + background)
- ✅ Gestion des cas limites : GPS off, réseau absent, permission refusée,
   démarrage hors-ligne, code invalide, auto-liaison, double-liaison

Voir **[RAPPORT.md](./RAPPORT.md)** pour le rapport technique détaillé
(choix, optimisations, limites, améliorations futures).
