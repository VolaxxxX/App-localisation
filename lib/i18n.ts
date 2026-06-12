import { getLocales } from 'expo-localization';
import type { Language } from '@/types';

/**
 * Tiny dependency-free i18n. Two languages (fr / en). The active language is
 * derived from the user profile, falling back to the device locale.
 */

type Dict = Record<string, string>;

const fr: Dict = {
  // Generic
  appName: 'GeoShare',
  loading: 'Chargement…',
  cancel: 'Annuler',
  save: 'Enregistrer',
  retry: 'Réessayer',
  ok: 'OK',
  close: 'Fermer',
  remove: 'Supprimer',
  copied: 'Copié !',

  // Auth
  signIn: 'Se connecter',
  signUp: 'Créer un compte',
  email: 'Adresse e-mail',
  password: 'Mot de passe',
  displayName: 'Prénom',
  noAccount: "Pas encore de compte ?",
  haveAccount: 'Déjà un compte ?',
  signOut: 'Se déconnecter',
  authErrorTitle: 'Erreur de connexion',
  invalidEmail: 'Adresse e-mail invalide.',
  weakPassword: 'Le mot de passe doit faire au moins 6 caractères.',
  emailInUse: 'Cette adresse e-mail est déjà utilisée.',
  wrongCredentials: 'E-mail ou mot de passe incorrect.',
  networkError: 'Pas de connexion réseau. Vérifie ta connexion.',
  fillAllFields: 'Merci de remplir tous les champs.',

  // Tabs
  tabMap: 'Carte',
  tabContacts: 'Contacts',
  tabProfile: 'Profil',

  // Map
  centerOnMe: 'Me centrer',
  fitAll: 'Tout voir',
  noLocationYet: 'Position en cours d\'acquisition…',
  locationDisabled: 'Localisation désactivée',
  locationDisabledMsg: 'Active la localisation pour partager ta position.',
  permissionDenied: 'Permission refusée',
  permissionDeniedMsg:
    'GeoShare a besoin de ta position pour fonctionner. Autorise la localisation dans les réglages.',
  openSettings: 'Ouvrir les réglages',
  sharingOn: 'Partage activé',
  sharingOff: 'Partage en pause',
  you: 'Moi',
  updatedAgo: 'Mis à jour',
  accuracy: 'Précision',
  metersAway: 'à {d}',

  // Presence
  online: 'En ligne',
  offline: 'Hors ligne',
  lastSeen: 'Vu',

  // Contacts
  contacts: 'Contacts',
  noContacts: 'Aucun contact pour l\'instant',
  noContactsMsg: 'Partage ton code ou rejoins quelqu\'un pour commencer.',
  addContact: 'Ajouter un contact',
  myCode: 'Mon code',
  shareCode: 'Partager mon code',
  copyCode: 'Copier le code',
  regenerateCode: 'Générer un nouveau code',
  regenerateConfirm:
    'Ton ancien code ne fonctionnera plus. Tes contacts actuels restent liés. Continuer ?',
  joinTitle: 'Rejoindre avec un code',
  joinPlaceholder: 'Entre un code à 6 caractères',
  join: 'Rejoindre',
  joining: 'Liaison…',
  joinSuccess: 'Lié avec succès !',
  codeNotFound: 'Ce code n\'existe pas.',
  cannotLinkSelf: 'Tu ne peux pas te lier à toi-même.',
  alreadyLinked: 'Vous êtes déjà liés.',
  removeContactConfirm: 'Supprimer ce contact ? Vous ne verrez plus vos positions.',

  // Profile
  profile: 'Profil',
  settings: 'Paramètres',
  shareLocation: 'Partager ma position',
  shareLocationDesc: 'Tes contacts liés voient ta position en temps réel.',
  backgroundLocation: 'Position en arrière-plan',
  backgroundLocationDesc:
    'Continuer à partager même téléphone verrouillé (recommandé).',
  notifications: 'Notifications',
  language: 'Langue',
  account: 'Compte',
  battery: 'Batterie',
  charging: 'En charge',
  memberSince: 'Membre depuis',
  dangerZone: 'Zone sensible',
  deleteAccount: 'Supprimer mon compte',
  chooseAvatar: 'Choisis ton avatar',
  chooseColor: 'Couleur du marqueur',

  // Errors / status
  errorTitle: 'Oups',
  somethingWrong: 'Une erreur est survenue.',
  gpsOff: 'GPS désactivé',
  gpsOffMsg: 'Active le GPS de ton téléphone pour une position précise.',
};

const en: Dict = {
  appName: 'GeoShare',
  loading: 'Loading…',
  cancel: 'Cancel',
  save: 'Save',
  retry: 'Retry',
  ok: 'OK',
  close: 'Close',
  remove: 'Remove',
  copied: 'Copied!',

  signIn: 'Sign in',
  signUp: 'Create account',
  email: 'Email address',
  password: 'Password',
  displayName: 'First name',
  noAccount: "Don't have an account?",
  haveAccount: 'Already have an account?',
  signOut: 'Sign out',
  authErrorTitle: 'Sign-in error',
  invalidEmail: 'Invalid email address.',
  weakPassword: 'Password must be at least 6 characters.',
  emailInUse: 'This email is already in use.',
  wrongCredentials: 'Incorrect email or password.',
  networkError: 'No network connection. Check your connection.',
  fillAllFields: 'Please fill in all fields.',

  tabMap: 'Map',
  tabContacts: 'Contacts',
  tabProfile: 'Profile',

  centerOnMe: 'Center on me',
  fitAll: 'Fit all',
  noLocationYet: 'Acquiring location…',
  locationDisabled: 'Location disabled',
  locationDisabledMsg: 'Enable location to share your position.',
  permissionDenied: 'Permission denied',
  permissionDeniedMsg:
    'GeoShare needs your location to work. Allow location access in settings.',
  openSettings: 'Open settings',
  sharingOn: 'Sharing on',
  sharingOff: 'Sharing paused',
  you: 'You',
  updatedAgo: 'Updated',
  accuracy: 'Accuracy',
  metersAway: '{d} away',

  online: 'Online',
  offline: 'Offline',
  lastSeen: 'Seen',

  contacts: 'Contacts',
  noContacts: 'No contacts yet',
  noContactsMsg: 'Share your code or join someone to get started.',
  addContact: 'Add a contact',
  myCode: 'My code',
  shareCode: 'Share my code',
  copyCode: 'Copy code',
  regenerateCode: 'Generate a new code',
  regenerateConfirm:
    'Your old code will stop working. Existing contacts stay linked. Continue?',
  joinTitle: 'Join with a code',
  joinPlaceholder: 'Enter a 6-character code',
  join: 'Join',
  joining: 'Linking…',
  joinSuccess: 'Successfully linked!',
  codeNotFound: 'This code does not exist.',
  cannotLinkSelf: 'You cannot link with yourself.',
  alreadyLinked: 'You are already linked.',
  removeContactConfirm: 'Remove this contact? You will no longer see each other.',

  profile: 'Profile',
  settings: 'Settings',
  shareLocation: 'Share my location',
  shareLocationDesc: 'Linked contacts see your real-time position.',
  backgroundLocation: 'Background location',
  backgroundLocationDesc: 'Keep sharing even when the phone is locked (recommended).',
  notifications: 'Notifications',
  language: 'Language',
  account: 'Account',
  battery: 'Battery',
  charging: 'Charging',
  memberSince: 'Member since',
  dangerZone: 'Danger zone',
  deleteAccount: 'Delete my account',
  chooseAvatar: 'Choose your avatar',
  chooseColor: 'Marker color',

  errorTitle: 'Oops',
  somethingWrong: 'Something went wrong.',
  gpsOff: 'GPS off',
  gpsOffMsg: 'Turn on your phone GPS for an accurate position.',
};

const DICTS: Record<Language, Dict> = { fr, en };

/** Detect the device's preferred language, defaulting to English. */
export function detectDeviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode ?? 'en';
    return code === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Translate a key. Supports simple `{name}` interpolation.
 * Falls back to English, then to the raw key.
 */
export function translate(
  lang: Language,
  key: keyof typeof fr,
  vars?: Record<string, string | number>,
): string {
  let str = DICTS[lang]?.[key] ?? en[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export type TranslateKey = keyof typeof fr;
