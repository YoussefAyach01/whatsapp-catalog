/** Flash messages shown on dashboard/login/signup, keyed by the ?msg= / ?error= codes the actions redirect with. */
export const MESSAGES: Record<string, string> = {
  welcome: 'Bienvenue ! Commencez par ajouter une catégorie, puis vos produits.',
  settings_saved: 'Réglages enregistrés.',
  category_added: 'Catégorie ajoutée.',
  category_deleted: 'Catégorie supprimée avec ses produits.',
  product_added: 'Produit ajouté.',
  product_saved: 'Produit mis à jour.',
  product_deleted: 'Produit supprimé.',
};

export const ERRORS: Record<string, string> = {
  rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
  email_taken: 'Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.',
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  invalid_email: 'Entrez une adresse e-mail valide.',
  invalid_password: 'Le mot de passe doit contenir au moins 10 caractères.',
  invalid_shopName: 'Entrez le nom de votre boutique (2 caractères minimum).',
  invalid_whatsapp: 'Numéro WhatsApp invalide. Exemple : 0612345678.',
  invalid_settings: 'Réglages invalides : vérifiez le nom, le numéro WhatsApp et la couleur.',
  invalid_category: 'Donnez un nom à la catégorie (60 caractères maximum).',
  invalid_product: 'Produit invalide : nom obligatoire et prix valide (ex. 45 ou 12,50).',
  invalid_photo: 'Photo invalide : utilisez une image JPEG, PNG ou WebP de 300 Ko maximum.',
  category_not_found: 'Catégorie introuvable.',
  plan_limit: 'Limite de 30 produits atteinte sur l’offre gratuite. Passez à Pro pour en ajouter davantage.',
};

export const pick = (map: Record<string, string>, code: string | undefined): string | undefined =>
  code ? map[code] : undefined;
