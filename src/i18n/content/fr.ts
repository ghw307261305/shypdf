// French (fr) tool-page SEO content — structure must match content/en.ts; quoted labels match locales/fr.ts.
import type { ToolContent } from './en';

const content: Record<string, ToolContent> = {
  'merge-pdf': {
    seoTitle: 'Fusionner PDF en ligne — gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Combinez vos PDF sans les envoyer où que ce soit', p: [
        'La plupart des outils de fusion en ligne envoient vos documents sur un serveur, les assemblent là-bas, puis vous renvoient le résultat. ShyPDF, lui, fait l’assemblage dans l’onglet de votre navigateur. Les PDF que vous choisissez sont lus depuis votre disque et chargés en mémoire, combinés sur votre propre appareil, puis enregistrés directement dans votre dossier de téléchargements.',
        'C’est donc une bonne solution pour les documents que l’on a le plus souvent besoin de fusionner : contrats signés, relevés bancaires, formulaires fiscaux, dossiers médicaux, pièces d’identité numérisées — autant de fichiers que l’on préfère ne pas confier à un tiers simplement pour les agrafer ensemble.' ] },
      { h: 'Obtenir le bon ordre', p: [
        'Les fichiers sont fusionnés dans l’ordre des cartes à l’écran. Faites glisser une carte pour la déplacer, utilisez les boutons ‹ › sur téléphone, ou cliquez sur « Trier par nom » si vos fichiers sont numérotés (fichier2 passe avant fichier10). Vous n’avez besoin que de quelques pages de l’un des fichiers ? Passez-le d’abord par Diviser PDF, puis fusionnez les morceaux.',
        'Chaque fichier source reçoit un signet de premier niveau dans le document fusionné : le lecteur peut ainsi passer d’un fichier d’origine à l’autre depuis le panneau latéral de sa visionneuse PDF. Décochez « Ajouter un signet pour chaque fichier » si vous préférez un document sans ces signets.' ] },
    ],
    faq: [
      { q: 'La fusion réduit-elle la qualité de mes PDF ?', a: 'Non. Les pages sont copiées telles quelles dans le nouveau fichier : le texte reste du texte et les images ne sont pas recompressées. Si le résultat est trop lourd pour un e-mail, passez-le ensuite par Compresser PDF.' },
    ],
  },
  'split-pdf': {
    seoTitle: 'Diviser PDF — extraire des pages, sans envoi | ShyPDF',
    sections: [
      { h: 'Extrayez exactement les pages dont vous avez besoin', p: [
        'Saisissez les plages de pages comme dans une boîte de dialogue d’impression : 1-3, 5, 8-10. Chaque partie séparée par une virgule devient un PDF distinct : cet exemple produit donc trois fichiers — les pages 1 à 3, la page 5 et les pages 8 à 10. Pour extraire un seul chapitre d’un long rapport, indiquez simplement une plage.',
        'D’autres modes couvrent les cas courants sans rien avoir à saisir : « Un fichier par page » éclate le document en pages individuelles, et les options pages impaires / pages paires sont bien utiles pour rattraper des numérisations faites avec un scanner qui ne lit qu’un côté des feuilles.' ] },
      { h: 'Ce que vous récupérez', p: [
        'Quand la division produit plusieurs fichiers, ils sont regroupés dans un seul zip, pour que votre navigateur ne vous sollicite pas pour chaque fichier ; jusqu’à six fichiers, vous pouvez aussi les télécharger un par un. Les pages sont copiées sans recompression : la qualité est identique à celle de l’original.',
        'La division se fait entièrement dans votre navigateur. Le document n’est jamais envoyé sur un serveur, ce qui compte quand on divise un fichier sensible justement pour n’en partager qu’une page anodine.' ] },
    ],
  },
  'rotate-pdf': {
    seoTitle: 'Pivoter PDF en ligne — gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Redressez pour de bon les pages couchées ou à l’envers', p: [
        'Faire pivoter l’affichage dans un lecteur PDF ne change que ce que vous voyez : la prochaine personne qui ouvrira le fichier retrouvera la même page de travers. ShyPDF modifie la rotation enregistrée dans le fichier lui-même : la correction est définitive, visible dans tous les lecteurs comme à l’impression.',
        'Faites pivoter toutes les pages d’un coup, ou choisissez « Certaines pages » et saisissez des plages comme 2, 5-7 pour ne tourner que les tableaux au format paysage ou les pages passées dans le scanner dans le mauvais sens.' ] },
      { h: 'Sans perte de qualité, sans envoi', p: [
        'La rotation ne fait que mettre à jour le réglage d’orientation de chaque page. Rien n’est redessiné ni recompressé : le texte reste sélectionnable et les images conservent exactement leur netteté. Tout se passe dans votre navigateur — le fichier n’est jamais envoyé sur un serveur.',
        'Vous voulez faire pivoter les pages une à une en les ayant sous les yeux ? Organiser PDF affiche une miniature de chaque page, avec son propre bouton de rotation.' ] },
    ],
  },
  'organize-pdf': {
    seoTitle: 'Organiser PDF — réordonner, supprimer des pages | ShyPDF',
    sections: [
      { h: 'Réorganisez un PDF en l’ayant sous les yeux', p: [
        'Organiser PDF affiche chaque page sous forme de miniature. Faites glisser les pages pour changer leur ordre, cliquez sur × pour écarter celles dont vous n’avez pas besoin — pages blanches du scanner, page de garde, annexe — et utilisez ↻ pour faire pivoter une seule page. Sur téléphone, les boutons ‹ › déplacent une page d’un cran à la fois.',
        'Quand l’ordre vous convient, « Enregistrer le PDF » crée un nouveau fichier qui contient uniquement ces pages, dans cet ordre. Votre fichier d’origine n’est pas modifié.' ] },
      { h: 'Confidentiel par conception', p: [
        'Les miniatures sont générées sur votre propre appareil, tout comme le nouveau PDF. Rien n’est envoyé : vous pouvez donc remettre en ordre en toute sécurité des documents contenant des informations personnelles ou confidentielles. Les gros documents passent aussi ; les miniatures sont dessinées au fur et à mesure des besoins, si bien qu’un fichier de plusieurs centaines de pages met simplement quelques secondes de plus à s’afficher.' ] },
    ],
  },
  'add-page-numbers': {
    seoTitle: 'Numéroter PDF — ajouter des numéros de page | ShyPDF',
    sections: [
      { h: 'Une numérotation fidèle à la vraie mise en page des documents', p: [
        'Les rapports et les mémoires commencent rarement leur numérotation dès la première feuille. Réglez « Commencer à la page » pour sauter une couverture ou un sommaire, et « Premier numéro » pour choisir ce qu’affiche la première page numérotée — par exemple, commencer à la page 3 avec le numéro 1. Choisissez n’importe quel coin, ou le centre du bord supérieur ou inférieur, et ajustez la marge pour que le numéro ne chevauche pas un pied de page existant.',
        'Parmi les formats proposés : les nombres seuls, « 1 / 10 », « - 1 - » et « Page 1 », ainsi que des formats chinois. La taille de police se règle de 6 à 48 pt.' ] },
      { h: 'Fonctionne avec tous les PDF, sans quitter votre appareil', p: [
        'Les numéros sont dessinés par-dessus chaque page : cela fonctionne donc aussi bien sur des documents numérisés que sur des PDF exportés depuis Word ou Google Docs. Le fichier est traité dans votre navigateur et n’est jamais envoyé sur un serveur. Vous réunissez plusieurs documents en un seul ? Fusionnez-les d’abord, puis numérotez le résultat pour que la numérotation se suive d’un bout à l’autre du fichier.' ] },
    ],
  },
  'add-watermark': {
    seoTitle: 'Ajouter un filigrane à un PDF — gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Marquez vos brouillons, vos copies et vos documents confidentiels', p: [
        'Saisissez le texte de votre choix — CONFIDENTIEL, BROUILLON, le nom d’un client, « Copie réservée à une demande de visa » — et ShyPDF l’appose sur chaque page. Optez pour une mention unique et centrée ou répétez-la sur toute la page, puis ajustez la taille, l’angle, la couleur et l’opacité jusqu’à ce qu’elle soit visible sans masquer le contenu.',
        'Un filigrane semi-transparent, répété sur toute la page et mentionnant le destinataire, est un moyen concret de décourager la réutilisation d’une pièce d’identité numérisée ou d’un contrat là où vous ne l’aviez pas prévu.' ] },
      { h: 'Toutes les langues, sans envoi', p: [
        'Le texte est dessiné avec les polices de votre appareil : les écritures comme le chinois, le japonais, l’arabe ou le cyrillique fonctionnent aussi bien que l’alphabet latin. Et comme tout le travail se fait dans votre navigateur, le document que vous cherchez à protéger n’est envoyé à personne au passage.' ] },
    ],
  },
  'jpg-to-pdf': {
    seoTitle: 'JPG en PDF — convertisseur gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Transformez photos et scans en un PDF bien rangé', p: [
        'Sélectionnez des images JPG, PNG ou WebP — photos de reçus prises au téléphone, pages numérisées, captures d’écran — et ShyPDF place une image par page dans un seul PDF. Faites glisser les cartes pour fixer l’ordre des pages avant de convertir.',
        'Choisissez « Identique à l’image » pour garder chaque image à sa taille naturelle, ou A4 / Letter pour obtenir des pages uniformes, l’image étant ajustée à la page — c’est en général ce qu’attend une plateforme de dépôt de dossier ou une imprimante. L’orientation peut suivre chaque image ou être imposée en portrait ou en paysage.' ] },
      { h: 'Vos photos restent sur votre appareil', p: [
        'Les photos de documents contiennent souvent précisément ce qu’il ne faut pas envoyer en ligne : signatures, adresses, numéros d’identité. Ici, la conversion se fait dans votre navigateur et les images ne quittent jamais votre appareil. Cochez « Compresser les images » si le PDF obtenu doit être assez léger pour partir par e-mail.' ] },
    ],
    faq: [
      { q: 'Puis-je convertir les photos HEIC d’un iPhone ?', a: 'Pas directement. Convertissez-les d’abord en JPG : sur iPhone, s’envoyer une photo par e-mail le fait généralement automatiquement ; vous pouvez aussi choisir « Le plus compatible » dans Réglages → Appareil photo → Formats pour que les nouvelles photos soient enregistrées en JPG.' },
    ],
  },
  'pdf-to-jpg': {
    seoTitle: 'PDF en JPG — convertisseur gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Enregistrez les pages d’un PDF en images', p: [
        'Chaque page de votre PDF est convertie en image JPG ou PNG. Préférez le JPG pour les photos et les numérisations quand le poids du fichier compte, et le PNG pour les pages de texte, les schémas ou les captures d’écran dont vous voulez des contours bien nets. Laissez le champ des pages vide pour tout convertir, ou saisissez des plages comme 1-3, 5 pour n’exporter que certaines pages.',
        'Choisissez la résolution selon la destination : 96 dpi pour le web et les messageries, 150 dpi pour un usage courant à l’écran, 300 dpi pour l’impression. Plus la résolution est élevée, plus les fichiers sont lourds et plus le rendu est long.' ] },
      { h: 'Un rendu réalisé en local', p: [
        'Les pages sont dessinées par votre propre navigateur, avec le même moteur open source (PDF.js) que celui du lecteur PDF de Firefox. Le PDF n’est jamais envoyé sur un serveur. Si vous convertissez plus d’une page, les images sont regroupées dans un seul zip à télécharger.' ] },
    ],
  },
  'pdf-to-word': {
    seoTitle: 'PDF en Word — convertisseur gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Un document modifiable, pas une simple image', p: [
        'ShyPDF lit le texte de votre PDF avec sa position, sa police et sa taille, et s’en sert pour reconstituer un vrai contenu Word : des paragraphes continus que vous pouvez retaper, des titres qui apparaissent dans le volet de navigation de Word, le gras et l’italique, l’alignement, les retraits, les tableaux simples et les images. Le format de page et les marges sont repris, et chaque page du PDF commence sur une nouvelle page dans Word.',
        'Un PDF n’enregistre ni paragraphes ni tableaux — seulement l’endroit où chaque caractère est dessiné. La conversion est donc une reconstitution raisonnée. Elle donne les meilleurs résultats avec les documents issus, à l’origine, d’un traitement de texte : lettres, contrats, rapports, mémoires et CV. Les mises en page à plusieurs colonnes sont lues colonne par colonne. Les pages très travaillées graphiquement, les formulaires et le texte superposé à des images ressortent simplifiés.' ] },
      { h: 'Le fichier à convertir est souvent justement le plus sensible', p: [
        'On convertit un PDF en Word pour modifier un contrat, compléter un courrier officiel ou mettre à jour un CV. Avec la plupart des convertisseurs en ligne, cela revient à envoyer le document à une entreprise dont vous ne savez rien. Ici, la conversion s’effectue dans l’onglet de votre navigateur, et le PDF ne quitte jamais votre appareil.',
        'Si l’outil vous indique que votre PDF ne contient pas de texte sélectionnable, c’est qu’il s’agit d’un scan. Utilisez d’abord OCR PDF pour en reconnaître le texte, puis convertissez le PDF avec recherche de texte ainsi obtenu.' ] },
    ],
    faq: [
      { q: 'Quelles applications peuvent ouvrir le résultat ?', a: 'C’est un fichier .docx standard : Microsoft Word, Google Docs, LibreOffice Writer, Apple Pages et WPS Office l’ouvrent tous.' },
    ],
  },
  'word-to-pdf': {
    seoTitle: 'Word en PDF — convertisseur gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Un vrai PDF, créé sur votre propre appareil', p: [
        'ShyPDF lit le fichier .docx, met lui-même chaque page en forme et écrit un PDF au texte sélectionnable, dans lequel la recherche fonctionne, avec des polices intégrées — pas une capture d’écran du document. Les styles, les titres, les listes à puces et numérotées, les tableaux avec leurs bordures et leur trame de fond, les images, les liens hypertextes, les en-têtes, les pieds de page et les numéros de page sont tous repris, avec le format de page et les marges définis dans le document.',
        'Rien n’est envoyé sur un serveur. C’est important pour les documents que l’on transforme généralement en PDF avant de les transmettre : offres, factures, contrats, CV et lettres de motivation.' ] },
      { h: 'Pourquoi les sauts de page sont les mêmes que dans Word', p: [
        'Les documents Word font généralement appel à des polices fournies uniquement avec Microsoft Office. ShyPDF les remplace par des polices open source conçues pour avoir exactement les mêmes largeurs de caractères — Carlito pour Calibri, Arimo pour Arial, Tinos pour Times New Roman, Cousine pour Courier New —, si bien que le texte passe à la ligne aux mêmes mots et que les sauts de page tombent presque aux mêmes endroits. Le dessin des lettres diffère légèrement ; la mise en page, non. Le chinois, le japonais et le coréen sont composés en Noto Sans.',
        'Certains éléments ne sont pas encore pris en charge : les sections à plusieurs colonnes, l’habillage du texte autour des images flottantes, les graphiques, les SmartArt et les écritures de droite à gauche. Le texte des zones de texte est conservé, mais replacé dans le flux normal de la page. Pour un document qui repose sur ces éléments, l’export en PDF depuis Word lui-même sera plus fidèle.' ] },
    ],
    faq: [
      { q: 'Les modifications suivies et les commentaires sont-ils inclus ?', a: 'Le PDF présente le document comme si toutes les modifications suivies avaient été acceptées : le texte inséré y figure, le texte supprimé n’y figure pas. Les commentaires ne sont pas repris.' },
    ],
  },
  'compress-pdf': {
    seoTitle: 'Compresser PDF en ligne — gratuit, sans envoi | ShyPDF',
    sections: [
      { h: 'Deux modes, car les PDF ne sont pas tous lourds pour les mêmes raisons', p: [
        'Le mode Léger reconstruit la structure interne du fichier et supprime les données redondantes. Le texte reste sélectionnable, la recherche reste possible et rien de visible ne change ; le gain habituel est de 5 à 30 %. C’est le premier essai à faire pour les documents exportés depuis Word, Google Docs ou des outils de création graphique.',
        'Le mode Fort convertit chaque page en image JPEG et construit un nouveau PDF à partir de ces images. C’est très efficace sur les documents numérisés et les fichiers riches en photos — souvent plus de 50 % de moins —, mais le texte n’est plus sélectionnable : conservez donc votre original. Choisissez 72, 110 ou 150 dpi selon que le résultat doit seulement être lisible à l’écran ou aussi être imprimé.' ] },
      { h: 'Un résultat annoncé honnêtement', p: [
        'ShyPDF affiche la taille avant et après. Si la compression ne rendait pas le fichier plus petit — cela arrive avec les PDF déjà optimisés —, il vous rend l’original plutôt qu’une copie « compressée » plus lourde.',
        'Tout se passe dans votre navigateur et le fichier n’est jamais envoyé sur un serveur : vous pouvez alléger un relevé bancaire ou un contrat pour respecter la limite de taille des pièces jointes sans le confier à un service de compression.' ] },
    ],
    faq: [
      { q: 'Quelle taille un PDF doit-il faire pour passer par e-mail ?', a: 'Gmail accepte des pièces jointes jusqu’à 25 Mo et Outlook.com jusqu’à 20 Mo, mais de nombreux serveurs de messagerie d’entreprise fixent des limites plus basses, souvent 10 Mo. Si le mode Fort à 110 dpi donne encore un fichier trop lourd, essayez 72 dpi, ou divisez le document et envoyez-le en plusieurs parties.' },
    ],
  },
  'ocr-pdf': {
    seoTitle: 'OCR PDF — reconnaissance de texte, sans envoi | ShyPDF',
    sections: [
      { h: 'Transformez un scan en PDF dans lequel on peut chercher', p: [
        'Un PDF numérisé est une pile d’images : impossible d’y faire une recherche, d’y sélectionner une phrase ou d’en copier un chiffre. L’OCR (reconnaissance optique de caractères) lit le texte contenu dans ces images. ShyPDF place les mots reconnus dans une couche invisible, exactement par-dessus ceux du scan : Ctrl+F, la sélection de texte et le copier-coller fonctionnent, alors que la page garde exactement le même aspect.',
        'Les pages d’origine ne sont ni recompressées ni redessinées : il n’y a donc aucune perte de qualité, et le fichier ne grossit que du poids du texte. Si seuls les mots vous intéressent, choisissez plutôt « Texte brut (.txt) ». Les pages qui contiennent déjà du texte sélectionnable sont ignorées par défaut, ce qui accélère le traitement des documents mixtes.' ] },
      { h: 'Obtenir de bons résultats', p: [
        'Choisissez la langue dans laquelle le document est rédigé : c’est, de loin, ce qui pèse le plus sur la précision. L’anglais, l’espagnol, le portugais, le français, l’allemand, l’italien, le japonais et le chinois simplifié sont proposés, et « Reconnaître aussi l’anglais » est utile pour les documents qui mêlent des termes anglais à une autre langue.',
        'La reconnaissance s’effectue dans votre navigateur grâce à Tesseract, un moteur d’OCR open source éprouvé de longue date, compilé en WebAssembly. Comptez quelques secondes par page, selon votre appareil. Relevés bancaires, pièces d’identité, dossiers médicaux, contrats signés : une fois numérisés, ce sont exactement les fichiers qu’il ne faut pas envoyer à un service d’OCR ; ici, ils ne quittent jamais votre appareil.' ] },
    ],
    faq: [
      { q: 'Puis-je lancer l’OCR sur une photo ou un JPG ?', a: 'Oui, en deux étapes : transformez les images en PDF avec JPG en PDF, puis passez ce PDF par OCR PDF.' },
    ],
  },
  'unlock-pdf': {
    seoTitle: 'Déverrouiller PDF — retirer un mot de passe connu | ShyPDF',
    sections: [
      { h: 'Pour vos propres documents, quand le mot de passe devient gênant', p: [
        'Banques, services de paie et portails administratifs envoient souvent leurs relevés sous forme de PDF protégés par mot de passe. C’est raisonnable pendant le transfert, et pénible ensuite : il faut retaper le mot de passe à chaque ouverture, et impossible de fusionner le fichier avec d’autres. Saisissez le mot de passe une seule fois et ShyPDF enregistre une copie qui s’ouvre normalement.',
        'Certains PDF s’ouvrent sans mot de passe mais interdisent l’impression, la copie ou la modification. Si un tel document vous appartient, ou si son propriétaire vous a demandé de travailler dessus, ShyPDF peut en enregistrer une copie sans ces restrictions. Il vous sera demandé de confirmer que vous en avez le droit.' ] },
      { h: 'Ce que cet outil ne fait pas', p: [
        'ShyPDF ne devine pas les mots de passe et ne permet pas de les retrouver. Si un fichier demande un mot de passe à l’ouverture et que vous ne l’avez pas, cet outil ne peut rien pour vous. Il sert à retirer la protection de documents que vous êtes en droit de modifier, et non celle de l’œuvre de quelqu’un d’autre.',
        'Le mot de passe que vous saisissez et le document lui-même restent sur votre appareil : le déchiffrement est effectué dans votre navigateur par qpdf, une bibliothèque PDF open source éprouvée de longue date, compilée en WebAssembly. Rien n’est envoyé.' ] },
    ],
  },
  'protect-pdf': {
    seoTitle: 'Protéger PDF par mot de passe — AES-256, sans envoi | ShyPDF',
    sections: [
      { h: 'Chiffrez un PDF avant de l’envoyer', p: [
        'Définissez un mot de passe d’ouverture et le document est chiffré en AES-256 ; personne ne peut le lire sans le mot de passe, quel que soit le lecteur PDF utilisé. Transmettez le mot de passe par un autre canal que le fichier : le PDF par e-mail et le mot de passe par SMS, par exemple.',
        'Vous pouvez aussi restreindre l’impression, la copie ou la modification. Sachez ce que cela signifie : ces restrictions sont appliquées par les lecteurs PDF, et non par le chiffrement du contenu. Considérez-les comme l’expression claire de votre intention, pas comme une protection forte. Pour tout ce qui est sensible, utilisez un mot de passe d’ouverture.' ] },
      { h: 'Le mot de passe ne quitte jamais votre navigateur', p: [
        'Avec un service qui passe par l’envoi des fichiers, votre document confidentiel et le mot de passe qui le protège voyagent tous deux jusqu’au serveur de quelqu’un d’autre. Ici, le chiffrement est effectué sur votre appareil par qpdf, une bibliothèque PDF open source compilée en WebAssembly, et ni le fichier ni le mot de passe ne sont envoyés où que ce soit.',
        'Il n’existe aucun moyen de récupérer un mot de passe oublié — ni pour vous, ni pour nous, puisque nous ne le voyons jamais. Conservez-le dans un gestionnaire de mots de passe.' ] },
    ],
    faq: [
      { q: 'Qu’est-ce qu’un bon mot de passe pour un PDF ?', a: 'C’est la longueur qui compte le plus. Quatre ou cinq mots choisis au hasard, ou au moins 14 caractères aléatoires générés par un gestionnaire de mots de passe, sont bien plus robustes qu’un mot de passe court avec des symboles. Évitez les dates de naissance et les numéros d’identité : ce sont les premières choses qu’un attaquant essaie.' },
    ],
  },
  'sign-pdf': {
    seoTitle: 'Signer PDF en ligne — gratuit, sans envoi ni compte | ShyPDF',
    sections: [
      { h: 'Signez sans imprimer, sans numériser et sans créer de compte', p: [
        'Ouvrez le PDF, créez votre signature et faites-la glisser sur la ligne de signature. Vous pouvez la dessiner à la souris, au doigt ou au stylet, saisir votre nom dans un style manuscrit, ou importer une photo de votre signature sur papier blanc — ShyPDF retire le fond du papier pour ne garder que l’encre. Utilisez les flèches pour atteindre la bonne page, faites glisser la poignée pour ajuster la taille, et cochez « Apposer sur toutes les pages » quand un document doit être paraphé de bout en bout.',
        'La signature est dessinée dans la page elle-même : elle apparaît donc dans tous les lecteurs PDF, ainsi qu’à l’impression. Votre fichier d’origine n’est pas modifié ; vous téléchargez une copie signée.' ] },
      { h: 'Votre signature n’a rien à faire sur un serveur', p: [
        'Une signature accompagnée d’un contrat signé : difficile de trouver documents plus sensibles. La plupart des sites de signature électronique conservent les deux sur leurs serveurs, et beaucoup exigent la création d’un compte. ShyPDF fait tout le travail dans votre navigateur : le PDF et la signature restent sur votre appareil, rien n’est conservé d’une visite à l’autre, et il n’y a pas de compte.',
        'Il s’agit d’une signature électronique simple — l’équivalent d’une signature sur une version imprimée — et non d’une signature numérique fondée sur un certificat. Elle est largement acceptée pour les démarches courantes, mais certains documents exigent légalement davantage ; en cas de doute, demandez au destinataire. Pour empêcher que le fichier signé soit modifié par la suite, passez-le par Protéger PDF et interdisez la modification.' ] },
    ],
  },
};

export default content;
