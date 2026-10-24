import { SupportedLanguage } from '../types';

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navbar
    'nav.digital_menu': 'Digital Menu',
    'nav.table_qr': 'Table QR',
    'nav.track_order': 'Track Order',
    'nav.past_orders': 'Past Orders',
    'nav.stamp_card': 'Stamp Card',
    'nav.owner_portal': 'Owner Portal',
    'nav.cart': 'Cart',
    'nav.powered_by': 'POWERED BY MENUMINT',
    'nav.switch_cafe': 'Switch Café',

    // Hero & Status
    'hero.accepting_orders': 'Accepting Orders',
    'hero.kitchen_paused': 'Kitchen Paused',
    'hero.digital_qr_menu': 'Digital QR Menu',
    'hero.kitchen_paused_title': 'Kitchen Ordering Temporarily Paused',
    'hero.kitchen_paused_desc': 'This café is taking a short pause for incoming orders. You may still browse items and check back shortly!',

    // Banners
    'banner.stamp_card_active': 'Digital Stamp Card Active!',
    'banner.stamp_card_desc': 'Collect stamps with your phone number to earn discounts on your order!',
    'banner.view_stamps': 'View My Stamps',
    'banner.reorder_title': 'Ordered here before? Tap to reorder your past favorites in 1 click!',
    'banner.past_orders_btn': 'Past Orders',

    // Menu Controls
    'menu.search_placeholder': 'Search coffee, drinks, bakery items...',
    'menu.all_items': 'All Items',
    'menu.dietary': 'Dietary:',
    'menu.all': 'All',
    'menu.no_items_found': 'No items found',
    'menu.try_different': 'Try selecting a different category or search term.',
    'menu.available': 'Available',
    'menu.sold_out': 'Sold Out',
    'menu.only_x_left': '⚠️ Only {count} Left!',
    'menu.add': 'Add',
    'menu.added': 'Added',

    // Dietary
    'dietary.vegan': 'Vegan',
    'dietary.vegetarian': 'Vegetarian',
    'dietary.gluten_free': 'Gluten-Free',
    'dietary.nut_free': 'Nut-Free',
    'dietary.spicy': 'Spicy',
    'dietary.chef_special': "Chef's Pick",

    // Stations
    'station.barista': '☕ Barista',
    'station.kitchen': '🍳 Kitchen Grill',
    'station.bakery': '🥐 Bakery',

    // Cart Drawer
    'cart.title': 'Your Order',
    'cart.empty_title': 'Your cart is empty',
    'cart.empty_desc': 'Add delicious coffees and pastries to get started.',
    'cart.dine_in': 'Dine-In',
    'cart.takeaway': 'Takeaway',
    'cart.customer_name': 'Your Name *',
    'cart.table_number': 'Table Number',
    'cart.phone_label': 'Phone (for Stamp Card & Alerts)',
    'cart.order_notes': 'Order Notes / Dietary Requests',
    'cart.optional': '(Optional)',
    'cart.notes_placeholder': 'e.g. Extra hot, oat milk substitute, dressing on side...',
    'cart.add_tip': 'Add Staff Gratuity',
    'cart.tip_custom': 'Custom Tip',
    'cart.promo_code': 'Promo Code',
    'cart.apply_code': 'Apply',
    'cart.subtotal': 'Subtotal',
    'cart.discount': 'Discount',
    'cart.loyalty_reward': 'Loyalty Reward Voucher',
    'cart.tax': 'Tax',
    'cart.tip': 'Staff Tip',
    'cart.total': 'Total',
    'cart.place_order': 'Place Order',
    'cart.submitting': 'Submitting Order...',
    'cart.split_bill': 'Split Bill Between Guests',
    'cart.remove': 'Remove',
    'cart.asap': '⚡ ASAP (~15-20m)',
    'cart.schedule_pickup': '🕒 Schedule Pickup',
    'cart.pickup_window': 'Pickup Window',
    'cart.select_slot': 'Select time window...',
    'cart.scheduled_alert': 'Advance order scheduled for pickup',
    'order.pickup_window': 'Scheduled Pickup Window',

    // Ready alert
    'alert.order_ready': 'Order Ready',
    'alert.order_ready_desc': 'Your order is hot and ready for pickup!',
    'alert.view': 'View',
  },

  es: {
    // Navbar
    'nav.digital_menu': 'Menú Digital',
    'nav.table_qr': 'QR de Mesa',
    'nav.track_order': 'Seguir Pedido',
    'nav.past_orders': 'Mis Pedidos',
    'nav.stamp_card': 'Tarjeta de Sellos',
    'nav.owner_portal': 'Portal de Dueño',
    'nav.cart': 'Carrito',
    'nav.powered_by': 'DESARROLLADO POR MENUMINT',
    'nav.switch_cafe': 'Cambiar Café',

    // Hero & Status
    'hero.accepting_orders': 'Aceptando Pedidos',
    'hero.kitchen_paused': 'Cocina en Pausa',
    'hero.digital_qr_menu': 'Menú Digital QR',
    'hero.kitchen_paused_title': 'Pedidos Temporalmente Pausados',
    'hero.kitchen_paused_desc': 'El café está tomando una breve pausa para nuevos pedidos. ¡Vuelve a consultar en unos minutos!',

    // Banners
    'banner.stamp_card_active': '¡Tarjeta de Sellos Activa!',
    'banner.stamp_card_desc': '¡Colecciona sellos con tu teléfono y gana descuentos en tus pedidos!',
    'banner.view_stamps': 'Ver Mis Sellos',
    'banner.reorder_title': '¿Has pedido antes? ¡Vuelve a pedir tus favoritos en 1 toque!',
    'banner.past_orders_btn': 'Mis Pedidos',

    // Menu Controls
    'menu.search_placeholder': 'Buscar café, bebidas, repostería...',
    'menu.all_items': 'Todos los Artículos',
    'menu.dietary': 'Dietética:',
    'menu.all': 'Todos',
    'menu.no_items_found': 'No se encontraron artículos',
    'menu.try_different': 'Intenta seleccionar otra categoría o término de búsqueda.',
    'menu.available': 'Disponible',
    'menu.sold_out': 'Agotado (86)',
    'menu.only_x_left': '⚠️ ¡Solo quedan {count}!',
    'menu.add': 'Añadir',
    'menu.added': 'Añadido',

    // Dietary
    'dietary.vegan': 'Vegano',
    'dietary.vegetarian': 'Vegetariano',
    'dietary.gluten_free': 'Sin Gluten',
    'dietary.nut_free': 'Sin Frutos Secos',
    'dietary.spicy': 'Picante',
    'dietary.chef_special': 'Especial del Chef',

    // Stations
    'station.barista': '☕ Barista',
    'station.kitchen': '🍳 Cocina',
    'station.bakery': '🥐 Repostería',

    // Cart Drawer
    'cart.title': 'Tu Pedido',
    'cart.empty_title': 'Tu carrito está vacío',
    'cart.empty_desc': 'Añade deliciosos cafés y pasteles para empezar.',
    'cart.dine_in': 'Para Servir',
    'cart.takeaway': 'Para Llevar',
    'cart.customer_name': 'Tu Nombre *',
    'cart.table_number': 'Número de Mesa',
    'cart.phone_label': 'Teléfono (para Sellos y Avisos)',
    'cart.order_notes': 'Notas del Pedido / Alergias',
    'cart.optional': '(Opcional)',
    'cart.notes_placeholder': 'Ej. Leche de avena, muy caliente, salsa aparte...',
    'cart.add_tip': 'Añadir Propina',
    'cart.tip_custom': 'Personalizada',
    'cart.promo_code': 'Código Promocional',
    'cart.apply_code': 'Aplicar',
    'cart.subtotal': 'Subtotal',
    'cart.discount': 'Descuento',
    'cart.loyalty_reward': 'Cupón de Recompensa',
    'cart.tax': 'Impuestos',
    'cart.tip': 'Propina',
    'cart.total': 'Total',
    'cart.place_order': 'Realizar Pedido',
    'cart.submitting': 'Enviando Pedido...',
    'cart.split_bill': 'Dividir Cuenta entre Amigos',
    'cart.remove': 'Eliminar',
    'cart.asap': '⚡ Lo antes posible (~15-20m)',
    'cart.schedule_pickup': '🕒 Programar Recogida',
    'cart.pickup_window': 'Horario de Recogida',
    'cart.select_slot': 'Seleccionar horario...',
    'cart.scheduled_alert': 'Pedido anticipado programado para recogida',
    'order.pickup_window': 'Horario de Recogida Programado',

    // Ready alert
    'alert.order_ready': 'Pedido Listo',
    'alert.order_ready_desc': '¡Tu pedido está caliente y listo para recoger!',
    'alert.view': 'Ver',
  },

  fr: {
    // Navbar
    'nav.digital_menu': 'Menu Numérique',
    'nav.table_qr': 'QR Table',
    'nav.track_order': 'Suivre Commande',
    'nav.past_orders': 'Mes Commandes',
    'nav.stamp_card': 'Carte de Fidélité',
    'nav.owner_portal': 'Portail Gérant',
    'nav.cart': 'Panier',
    'nav.powered_by': 'PROPULSÉ PAR MENUMINT',
    'nav.switch_cafe': 'Changer de Café',

    // Hero & Status
    'hero.accepting_orders': 'Commandes Ouvertes',
    'hero.kitchen_paused': 'Cuisine en Pause',
    'hero.digital_qr_menu': 'Menu Numérique QR',
    'hero.kitchen_paused_title': 'Commandes Temporairement Suspendues',
    'hero.kitchen_paused_desc': 'Le café fait une courte pause pour les commandes. Vous pouvez continuer à parcourir la carte !',

    // Banners
    'banner.stamp_card_active': 'Carte de Fidélité Active !',
    'banner.stamp_card_desc': 'Cumulez des tampons avec votre numéro de téléphone et gagnez des réductions !',
    'banner.view_stamps': 'Voir Mes Tampons',
    'banner.reorder_title': 'Déjà commandé ? Renouvelez votre commande préférée en 1 clic !',
    'banner.past_orders_btn': 'Mes Commandes',

    // Menu Controls
    'menu.search_placeholder': 'Rechercher café, boissons, pâtisseries...',
    'menu.all_items': 'Tous les Produits',
    'menu.dietary': 'Régime :',
    'menu.all': 'Tous',
    'menu.no_items_found': 'Aucun produit trouvé',
    'menu.try_different': 'Sélectionnez une autre catégorie ou modifiez votre recherche.',
    'menu.available': 'Disponible',
    'menu.sold_out': 'Épuisé (86)',
    'menu.only_x_left': '⚠️ Plus que {count} disponible(s) !',
    'menu.add': 'Ajouter',
    'menu.added': 'Ajouté',

    // Dietary
    'dietary.vegan': 'Végétalien',
    'dietary.vegetarian': 'Végétarien',
    'dietary.gluten_free': 'Sans Gluten',
    'dietary.nut_free': 'Sans Fruits à Coque',
    'dietary.spicy': 'Épicé',
    'dietary.chef_special': 'Coup de Cœur Chef',

    // Stations
    'station.barista': '☕ Barista',
    'station.kitchen': '🍳 Cuisine',
    'station.bakery': '🥐 Boulangerie',

    // Cart Drawer
    'cart.title': 'Votre Commande',
    'cart.empty_title': 'Votre panier est vide',
    'cart.empty_desc': 'Ajoutez de délicieux cafés et douceurs pour démarrer.',
    'cart.dine_in': 'Sur Place',
    'cart.takeaway': 'À Emporter',
    'cart.customer_name': 'Votre Nom *',
    'cart.table_number': 'Numéro de Table',
    'cart.phone_label': 'Téléphone (pour Fidélité et Alertes)',
    'cart.order_notes': 'Instructions / Allergies',
    'cart.optional': '(Facultatif)',
    'cart.notes_placeholder': 'Ex. Lait d\'avoine, bien chaud, sauce à part...',
    'cart.add_tip': 'Ajouter un Pourboire',
    'cart.tip_custom': 'Personnalisé',
    'cart.promo_code': 'Code Promo',
    'cart.apply_code': 'Appliquer',
    'cart.subtotal': 'Sous-total',
    'cart.discount': 'Réduction',
    'cart.loyalty_reward': 'Bon de Récompense',
    'cart.tax': 'TVA',
    'cart.tip': 'Pourboire',
    'cart.total': 'Total',
    'cart.place_order': 'Confirmer la Commande',
    'cart.submitting': 'Transmission en cours...',
    'cart.split_bill': 'Partager l\'Addition',
    'cart.remove': 'Supprimer',
    'cart.asap': '⚡ Dès que possible (~15-20m)',
    'cart.schedule_pickup': '🕒 Retrait Programmé',
    'cart.pickup_window': 'Créneau de Retrait',
    'cart.select_slot': 'Choisir un créneau...',
    'cart.scheduled_alert': 'Commande programmée pour retrait',
    'order.pickup_window': 'Créneau de Retrait Programmé',

    // Ready alert
    'alert.order_ready': 'Commande Prête',
    'alert.order_ready_desc': 'Votre commande est prête à être récupérée !',
    'alert.view': 'Voir',
  },

  it: {
    // Navbar
    'nav.digital_menu': 'Menu Digitale',
    'nav.table_qr': 'QR Tavolo',
    'nav.track_order': 'Segui Ordine',
    'nav.past_orders': 'I Miei Ordini',
    'nav.stamp_card': 'Carta Fedeltà',
    'nav.owner_portal': 'Portale Gestore',
    'nav.cart': 'Carrello',
    'nav.powered_by': 'OFFERTO DA MENUMINT',
    'nav.switch_cafe': 'Cambia Locale',

    // Hero & Status
    'hero.accepting_orders': 'Ordini Aperti',
    'hero.kitchen_paused': 'Cucina in Pausa',
    'hero.digital_qr_menu': 'Menu Digitale QR',
    'hero.kitchen_paused_title': 'Ordini Momentaneamente Sospesi',
    'hero.kitchen_paused_desc': 'La cucina si sta prendendo una breve pausa per nuovi ordini. Puoi consultare il menu e riprovare a breve!',

    // Banners
    'banner.stamp_card_active': 'Carta Fedeltà Attiva!',
    'banner.stamp_card_desc': 'Raccogli timbri con il tuo numero di telefono e ricevi sconti esclusivi sui tuoi ordini!',
    'banner.view_stamps': 'I Miei Timbri',
    'banner.reorder_title': 'Hai già ordinato qui? Riordina i tuoi piatti preferiti con 1 tocco!',
    'banner.past_orders_btn': 'I Miei Ordini',

    // Menu Controls
    'menu.search_placeholder': 'Cerca caffè, drink, dolci...',
    'menu.all_items': 'Tutti i Piatti',
    'menu.dietary': 'Dieta:',
    'menu.all': 'Tutti',
    'menu.no_items_found': 'Nessun piatto trovato',
    'menu.try_different': 'Prova a selezionare un\'altra categoria o termine di ricerca.',
    'menu.available': 'Disponibile',
    'menu.sold_out': 'Esaurito (86)',
    'menu.only_x_left': '⚠️ Solo {count} rimasti!',
    'menu.add': 'Aggiungi',
    'menu.added': 'Aggiunto',

    // Dietary
    'dietary.vegan': 'Vegano',
    'dietary.vegetarian': 'Vegetariano',
    'dietary.gluten_free': 'Senza Glutine',
    'dietary.nut_free': 'Senza Frutta a Guscio',
    'dietary.spicy': 'Piccante',
    'dietary.chef_special': 'Scelta dello Chef',

    // Stations
    'station.barista': '☕ Banco Bar',
    'station.kitchen': '🍳 Cucina Calda',
    'station.bakery': '🥐 Forno e Pasticceria',

    // Cart Drawer
    'cart.title': 'Il Tuo Ordine',
    'cart.empty_title': 'Il carrello è vuoto',
    'cart.empty_desc': 'Aggiungi caffè aromatici e dolci artigianali per iniziare.',
    'cart.dine_in': 'Al Tavolo',
    'cart.takeaway': 'Da Asporto',
    'cart.customer_name': 'Il Tuo Nome *',
    'cart.table_number': 'Numero Tavolo',
    'cart.phone_label': 'Telefono (per Timbri e Notifiche)',
    'cart.order_notes': 'Note per la Cucina / Allergie',
    'cart.optional': '(Opzionale)',
    'cart.notes_placeholder': 'Es. Latte d\'avena, ben caldo, condimento a parte...',
    'cart.add_tip': 'Lascia una Mancia allo Staff',
    'cart.tip_custom': 'Personalizzata',
    'cart.promo_code': 'Codice Promozionale',
    'cart.apply_code': 'Applica',
    'cart.subtotal': 'Subtotale',
    'cart.discount': 'Sconto',
    'cart.loyalty_reward': 'Buono Fedeltà Applicato',
    'cart.tax': 'IVA',
    'cart.tip': 'Mancia',
    'cart.total': 'Totale',
    'cart.place_order': 'Invia Ordine',
    'cart.submitting': 'Invio in corso...',
    'cart.split_bill': 'Dividi il Conto',
    'cart.remove': 'Rimuovi',
    'cart.asap': '⚡ Subito (~15-20m)',
    'cart.schedule_pickup': '🕒 Programma Ritiro',
    'cart.pickup_window': 'Fascia Oraria Ritiro',
    'cart.select_slot': 'Seleziona orario...',
    'cart.scheduled_alert': 'Ordine programmato per il ritiro',
    'order.pickup_window': 'Fascia Oraria di Ritiro',

    // Ready alert
    'alert.order_ready': 'Ordine Pronto',
    'alert.order_ready_desc': 'Il tuo ordine è caldo e pronto per essere ritirato!',
    'alert.view': 'Vedi',
  },
};

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('lang') as SupportedLanguage;
    if (param && ['en', 'es', 'fr', 'it'].includes(param)) {
      localStorage.setItem('menumint_language', param);
      return param;
    }
    const saved = localStorage.getItem('menumint_language') as SupportedLanguage;
    if (saved && ['en', 'es', 'fr', 'it'].includes(saved)) {
      return saved;
    }
    const browserLang = navigator.language?.slice(0, 2) as SupportedLanguage;
    if (['es', 'fr', 'it'].includes(browserLang)) {
      return browserLang;
    }
  }
  return 'en';
}

export function setStoredLanguage(lang: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('menumint_language', lang);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url.toString());
  }
}

export function t(
  key: string,
  lang: SupportedLanguage = 'en',
  params?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

