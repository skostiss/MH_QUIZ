// ============================================
// BANQUE DE QUESTIONS - MALAKOFF QUIZ
// ============================================
// Ce fichier est géré automatiquement par l'interface d'administration
// Dernière modification : 25/11/2025 22:50:25
// ============================================

// DÉFINITION DES MANCHES
const MANCHES = {
  1: { id: 1, nom: "Sel ou poivre", rangeDebut: 1, rangeFin: 8 },
  2: { id: 2, nom: "Le juste chiffre", rangeDebut: 9, rangeFin: 14 },
  3: { id: 3, nom: "Vrai ou faux Express", rangeDebut: 15, rangeFin: 24 },
  4: { id: 4, nom: "Le menu", rangeDebut: 25, rangeFin: 28 },
  5: { id: 5, nom: "Qui suis-je ?", rangeDebut: 29, rangeFin: 40 }
};

const questions = [
  {
    "id": 1,
    "type": "Libre",
    "question": "Pouvez-vous citer les 3 items de la qualité orale?",
    "reponseReference": "LA REPONSE - LA MAITRISE DE L ENTRETIEN TELEPHONIQUE -  PROCEDURES ",
    "manche": 1
  },
  {
    "id": 2,
    "type": "Libre",
    "question": "Pouvez-vous citer 3 Indicateurs qui comptent pour la prime trimestrielles des managers ?",
    "reponseReference": "La satisfaction globale équipe , clarté équipe, DMt tél équipe",
    "manche": 1
  },
  {
    "id": 3,
    "type": "Libre",
    "question": "Citez 3 sites de RC internes",
    "reponseReference": "(Blois , Angers, Metz, montpellier)",
    "manche": 1
  },
  {
    "id": 4,
    "type": "Libre",
    "question": "Citez 3 actions que les Conseillers référents doivent réaliser au quotidien.",
    "reponseReference": "Répondre au soutien métier, le traitement des bal rce retours, faire des ezv pour cas complexes , écoute qualité, accompagnement",
    "manche": 1
  },
  {
    "id": 5,
    "type": "Libre",
    "question": "Pouvez-citer 3 Indicateurs visibles sur un bandeau des conseillers?",
    "reponseReference": "QS, attente, appels traités et %pause tél",
    "manche": 1
  },
  {
    "id": 6,
    "type": "Libre",
    "question": "Pouvez-vous citer 3 statuts Odigo HORS production?",
    "reponseReference": "Formation, qualité, autres activités, lecture d'infos, dysfonctionnement informatique",
    "manche": 1
  },
  {
    "id": 7,
    "type": "Libre",
    "question": "Connaissez-vous trois noms de responsables du service relation client ?",
    "reponseReference": "(Florian Germain, Sabrina Sollazo, Idriss Moula, Sylvie Bernardeau, Nicolas Robert",
    "manche": 1
  },
  {
    "id": 8,
    "type": "QCM",
    "question": "7h du matin",
    "choix": [
      "Est-ce l’heure à laquelle le premier conseiller interne arrive ?",
      " Est-ce l’heure du premier SMS reçu par un responsable d’équipe en cas d’imprévu ? ",
      "Est-ce l’heure du premier arrivé chez les prestataires ?",
      "Aucune des réponses"
    ],
    "bonneReponse": "B",
    "manche": 2
  },
  {
    "id": 9,
    "type": "QCM",
    "question": "3",
    "manche": 2,
    "choix": [
      " Est-ce le nombre d'appels clients pris à l'heure par un conseiller ?",
      "Est-ce le nombre de mails que l’Hypervision nous envoie par jour pour nous tenir informés des chiffres clés ?",
      "Est-ce le nombre de fois que je décale la sonnerie de mon réveil les matins d’hiver ?",
      "Aucune des réponses"
    ],
    "bonneReponse": "B"
  },
  {
    "id": 10,
    "type": "QCM",
    "question": "Le chiffre juste est 40 ",
    "manche": 2,
    "choix": [
      "Est-ce le nombre de pages ouvertes par un conseiller pour traiter un dossier ?",
      "Est-ce le nombre de bugs informatiques par jour ? ",
      "Est-ce le nombre d'indicateurs qu'un responsable d'équipe doit suivre par conseiller depuis ses PBI ?",
      "Est-ce que ça peut-être la réponse A, B et C ?"
    ],
    "bonneReponse": "C"
  },
  {
    "id": 11,
    "type": "QCM",
    "question": "2H30",
    "choix": [
      "Est-ce le temps moyen d'une réunion COPROD des responsable de service ?",
      "Est-ce le temps moyen des CR d’un COMOP de l'Assistance métier?",
      "Est-ce le temps d’attente maximal d’un client pour nous joindre?",
      "Aucune idée, mais j’aime bien la lettre D "
    ],
    "bonneReponse": "A",
    "manche": 2
  },
  {
    "id": 12,
    "type": "QCM",
    "question": "3 Heures ",
    "choix": [
      "Est-ce la durée moyenne de soutien d’un conseiller référent par jour ? ",
      "Est-ce le temps de téléphone minimum par conseiller client en temps plein journalier ? ",
      " Est-ce le temps de pause maximum du midi?",
      "Aucune des réponses"
    ],
    "bonneReponse": "B",
    "manche": 2
  },
  {
    "id": 13,
    "type": "VraiFaux",
    "question": "Est-ce que les RS doivent animer chaque semaine des réunions avec tous les managers RC ?\n\n",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 14,
    "type": "QCM",
    "question": "La bonne réponse est 4 ",
    "manche": 2,
    "choix": [
      "Est-ce le nombre de personnes qui travaillent à l’assistance métier RC ? ",
      "Est-ce le nombre de FAQ RCE intégrées dans Mayday ? ",
      "Est-ce le nombre de minutes qu’un PC met à s’ouvrir le matin en moyenne ? ",
      ""
    ],
    "bonneReponse": "A"
  },
  {
    "id": 15,
    "type": "VraiFaux",
    "question": "Est-ce que les managers remplissent un compte rendu d’activité détaillé chaque jour ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 16,
    "type": "VraiFaux",
    "question": "Est-ce que chaque RS de la RC est forcément ambassadeur et responsable d'un process ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 17,
    "type": "VraiFaux",
    "question": "Est-ce que les CR font aussi le soutien métier des prestataires ?\n\n",
    "manche": 3,
    "bonneReponse": "Faux"
  },
  {
    "id": 18,
    "type": "VraiFaux",
    "question": "Est-ce que les conseillers qui dépassent 60% de taux tél par trimestre ont une prime ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 19,
    "type": "VraiFaux",
    "question": "Est-ce qu’une CR a 40% de production à réaliser en plus de son activité de soutien ?",
    "manche": 3,
    "bonneReponse": "Faux"
  },
  {
    "id": 20,
    "type": "VraiFaux",
    "question": "Est-ce qu’un manager justifie chaque enquête de satisfaction négative reçue par son équipe ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 21,
    "type": "VraiFaux",
    "question": "Est-ce qu’il existe 5 files d’appel RCE ? ",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 22,
    "type": "VraiFaux",
    "question": "Est-ce que les Conseillers peuvent utiliser plus de 20 statuts Odigo différents ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 23,
    "type": "VraiFaux",
    "question": "Est-ce qu’un manager peut appartenir à plus de 20 groupes Teams ?",
    "manche": 3,
    "bonneReponse": "Vrai"
  },
  {
    "id": 24,
    "type": "Libre",
    "question": "Pouvez-vous citer 5 missions au sein de la RCE des conseillers client ?",
    "manche": 4,
    "reponseReference": "Support extranet  FIO Qualité  Réclamations insatisfaction  Ambassadeurs Mayday"
  },
  {
    "id": 25,
    "type": "Libre",
    "question": "Pouvez-vous citer les 5 plus grands projets qui arriveront en RC ?",
    "manche": 4,
    "reponseReference": "MAYDAY : base de connaissance intelligente pour centraliser, structurer et diffuser l’information métier avec IA.  Speech to Text : conversion automatique de la parole en texte pour faciliter la transcription des échanges.  Numéro unique MH1ID : identification unique pour suivre et tracer les interactions clients.  CRM poste de travail : intégration du logiciel de gestion de la relation client directement dans le poste de travail des conseillers.  Distribution de l’activité : gestion et répartition optimisée des appels ou tâches entre les conseillers selon les règles définies."
  },
  {
    "id": 26,
    "type": "Libre",
    "question": "Pouvez-vous citer les 5 plus grosses BAL ou adresses mail internes dont les responsables d’équipe ont la responsabilité de piloter et suivre au quotidien ?",
    "manche": 4,
    "reponseReference": "Boîte « Vrai réclamation attente service interne »  Boîte « Mail anoRCE remontée RCE »  Boîte « Mail urgence commerciale »  Boîte « Mail entreprise ADP »  Boîte « Mail accueil nouveau client »"
  },
  {
    "id": 27,
    "type": "Libre",
    "question": "Pouvez-vous citer les 5 principaux indicateurs chiffrés qu’un Responsable de service (RS) doit expliquer au quotidien ?",
    "manche": 4,
    "reponseReference": "La DMT (Durée Moyenne de Traitement) du site  La satisfaction globale du site  La note de clarté du site  Les notes de qualité du site  L'ancienneté des stocks mails"
  },
  {
    "id": 28,
    "type": "Libre",
    "question": "Chaque semaine, c’est le moment où les dossiers sérieux croisent les blagues bien choisies (et parfois, les sourires complices en option).\nOn échange sur tout ce qui fait avancer, parfois en sirotant un café virtuel au loin.\nOn décortique chiffres et projets,\net c’est aussi le moment où l’on dit à son manager : « J’ai eu trop de dispo cette semaine » ou « trop de renfort ».",
    "manche": 5,
    "reponseReference": "RÉUNION D'ÉQUIPE"
  },
  {
    "id": 29,
    "type": "Libre",
    "question": "On fait appel à moi quand ça monte, mais les appels restent toujours muets.\nC’est le moment parfait pour appliquer une stratégie et faire le grand ménage.\nGrâce à moi, ton portefeuille te dit merci (enfin, un peu).\n\nQui suis-je ?",
    "manche": 5,
    "reponseReference": "LES SAMEDIS TRAVAILLÉS"
  },
  {
    "id": 30,
    "type": "Libre",
    "question": "Je te raconte tout : même combien tu bosses bien.\nJe suis un miroir numérique un peu capricieux, parfois prêt à charger, patience, jeune padawan.\nJe te connais encore mieux que tes collègues et presque autant que ton manager.\nJe suis un outil qui a la force (power).\n\nQui suis-je ?",
    "manche": 5,
    "reponseReference": "POWER BI"
  },
  {
    "id": 31,
    "type": "Libre",
    "question": "Quand on parle de moi, c’est souvent avec émotion.\nChacun a sa propre technique pour m’aborder.\nJe peux susciter la joie ou la colère.\nParfois je file à toute vitesse, parfois je prends mon temps…\nTIC TAC\n\nQui suis-je ?",
    "manche": 5,
    "reponseReference": "DÉLAIS DE TRAITEMENT"
  }
];

module.exports = questions;
module.exports.MANCHES = MANCHES;
