// ============================================
// BANQUE DE QUESTIONS - MALAKOFF QUIZ
// ============================================
// Ce fichier est géré automatiquement par l'interface d'administration
// Dernière modification : 19/11/2025 21:27:20
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
    "manche": 1,
    "type": "Libre",
    "question": "Citez 3 items de la qualité orale.",
    "reponseReference": "réponse , maitrise de l'entretien, procédure,"
  },
  {
    "id": 2,
    "manche": 1,
    "type": "Libre",
    "question": "3 Indicateurs qui comptent pour la prime T managers ?",
    "reponseReference": "sat globale equipe , clarté équipe, DMt tél equipe"
  },
  {
    "id": 3,
    "manche": 1,
    "type": "Libre",
    "question": "Citez 3 sites RC internes",
    "reponseReference": "(Blois , Angers, Metz, montpellier)"
  },
  {
    "id": 4,
    "manche": 1,
    "type": "Libre",
    "question": "Citez 3 actions que les CR doivent réaliser au quotidien.",
    "reponseReference": "(Réponse : répondre au soutien métiers, bal rce retours, faire des ezv pour cas complexe,ecoute quali accompagnement)"
  },
  {
    "id": 5,
    "manche": 1,
    "type": "Libre",
    "question": "3 Indicateurs visibles sur un bandeau conseiller",
    "reponseReference": "QS, attente, appels traités et %pause tél"
  },
  {
    "id": 6,
    "manche": 1,
    "type": "Libre",
    "question": "3 statuts Odigo HORS production",
    "reponseReference": "(formation, qualité, autres activités, lecture d'infos, pb informatique)"
  },
  {
    "id": 7,
    "manche": 1,
    "type": "Libre",
    "question": "3 noms de responsables de service RC",
    "reponseReference": "(Florian germain, Sabrina sollazo, Idriss moula, Sylvie bernardeau, Nicolas Robert)"
  },
  {
    "id": 8,
    "manche": 1,
    "type": "Libre",
    "question": "3 noms de conseillers qui se connectent régulièrement très tôt le matin",
    "reponseReference": "(Robin, Sandrine, etc libre)"
  },
  {
    "id": 9,
    "manche": 2,
    "type": "QCM",
    "question": "3",
    "choix": [
      "Nombre appels client pris à l'heure ",
      "Heure du premier SMS  reçu par une RE en cas d'imprévu",
      "Heure du premier arrivé chez les prestataires",
      "Aucune des réponses"
    ],
    "bonneReponse": "B"
  },
  {
    "id": 10,
    "manche": 2,
    "type": "QCM",
    "question": "7h du matin",
    "choix": [
      "Heure à laquelle le premier conseiller interne arrive ",
      "Heure du premier SMS  reçu par une RE en cas d'imprévu",
      "Heure du premier arrivé chez les prestataires",
      "Aucune des réponses"
    ],
    "bonneReponse": "B"
  },
  {
    "id": 11,
    "manche": 2,
    "type": "QCM",
    "question": "40",
    "choix": [
      "Nombre de page ouverture par un conseillers pour traiter un dossier ",
      "Nombre de bugs Informatiques par jour ",
      "Nombre d'indicateurs qu'un RE doit suivre par conseillers depuis ses PBI",
      "Aucune des réponses"
    ],
    "bonneReponse": "C"
  },
  {
    "id": 12,
    "manche": 2,
    "type": "QCM",
    "question": "2H30",
    "choix": [
      "Temps moyen d'une réunion RS en coprod",
      "Temps moyen d'une comop Assistance métiers CR",
      "Temps d'attente maximale d'un client",
      "Aucune des réponses"
    ],
    "bonneReponse": "A"
  },
  {
    "id": 13,
    "manche": 2,
    "type": "QCM",
    "question": "3",
    "choix": [
      "Durée moyenne du soutien CR par jour",
      "Temps de tél minimum par cc journaliers temps plein",
      "Temps de la Pause maximum du midi",
      "Aucune des réponses"
    ],
    "bonneReponse": "B"
  },
  {
    "id": 14,
    "manche": 2,
    "type": "QCM",
    "question": "4",
    "choix": [
      "Nombre de personne qui travaille à l'assistance métier RC",
      "Le nombre de faq rce intégré dans mayday",
      "le nombre de minutes qu'un pc met à s'ouvrir le matin en moyenne",
      "Aucune des réponses"
    ],
    "bonneReponse": "A"
  },
  {
    "id": 15,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Les managers remplissent un compte rendu d'activité détaillé chaque jour",
    "bonneReponse": "Vrai"
  },
  {
    "id": 16,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Les RS doivent animer chaque semaine des réunions avec tous les managers RC",
    "bonneReponse": "Vrai"
  },
  {
    "id": 17,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Chaque RS de la RC est forcément ambassadeur et responsable d'un process",
    "bonneReponse": "Vrai"
  },
  {
    "id": 18,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Les CR font aussi le soutien métier des prestataires",
    "bonneReponse": "Faux"
  },
  {
    "id": 19,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Les conseillers qui dépassent 60% de taux tél par trimestre ont une prime",
    "bonneReponse": "Vrai"
  },
  {
    "id": 20,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Une CR a 40% de production à réaliser en plus de son activité de soutien",
    "bonneReponse": "Faux"
  },
  {
    "id": 21,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Un manager justifie chaque enquête de satisfaction négative reçu par son équipe",
    "bonneReponse": "Vrai"
  },
  {
    "id": 22,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Il existe 5 files d'appel rce ",
    "bonneReponse": "Vrai"
  },
  {
    "id": 23,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Les Conseillers peuvent utiliser plus de 20 statuts odigo différents",
    "bonneReponse": "Vrai"
  },
  {
    "id": 24,
    "manche": 3,
    "type": "VraiFaux",
    "question": "Un manager appartient à plus de 20 groupes TEAMS",
    "bonneReponse": "Vrai"
  },
  {
    "id": 25,
    "manche": 4,
    "type": "Libre",
    "question": "CC: 5 missions au sein de la RCE",
    "reponseReference": "•\trep 1 = Support extranet •\trep 2 = FIO •\trep 3 = Qualité •\trep 4 = Recla insat •\trep 5 = Ambassadeurs mayday"
  },
  {
    "id": 26,
    "manche": 4,
    "type": "Libre",
    "question": "RC: Citez les 5 plus gros projet qui arriveront en RC",
    "reponseReference": "•\trep 1 = MAYDAY base de connaissance •\trep 2 = speech to text •\trep 3 = numero unique MH1ID •\trep 4 = CRM poste de travail •\trep 5 = Distribution de l'activité"
  },
  {
    "id": 27,
    "manche": 4,
    "type": "Libre",
    "question": "RE : 5 plus grosses bal ou adresse mail qu'ils ont la responsabilité de piloter et suivre au quotidien",
    "reponseReference": "•\trep 1 = Vrai recla attente service interne •\trep 2 =  mail ano rce remontee rce •\trep 3 =  mail Urgence commerciale •\trep 4 = mail entreprise ADP •\trep 5 = mail accueil nouveau client"
  },
  {
    "id": 28,
    "manche": 4,
    "type": "Libre",
    "question": "RS : les 5 plus gros chiffres qu'un RS doit expliquer au quotidien",
    "reponseReference": "•\trep 1 = La dmt du site •\trep 2 = La satisfaction globale du site •\trep 3 = la note clarté du site •\trep 4 = les notes quali du site •\trep 5 = l'ancienneté des stock mails"
  },
  {
    "manche": 5,
    "type": "Libre",
    "question": "On y parle de chiffres, de projets, et parfois même de la météo… enfin, presque, on n'est pas météorologues. C'est le moment où les dossiers sérieux croisent les blagues bien choisies (et en option, les regards félins). On échange sur tout ce qui fait avancer, parfois en sirotant un café virtuel au loin. On décortique chiffres et projets, avec des regards complices histoire de ne pas trop se prendre au sérieux. C'est l'endroit où les idées fusent et les sourires ne sont jamais bien loin, même pour les plus sérieux. Qui suis-je ?",
    "reponseReference": "RÉUNION D'ÉQUIPE",
    "id": 29
  },
  {
    "manche": 5,
    "type": "Libre",
    "question": "Je suis un jour où normalement on chôme, mais plusieurs fois par an la société propose de me transformer en terrain de chasse aux dossiers. Plusieurs fois par an, je me transforme en zone de haute activité où les téléphones restent désespérément muets. C'est le moment parfait pour faire le grand ménage dans les stocks, tel un ninja du classement. Bonus sympa : ce jour-là, les heures sont majorées, donc ton portefeuille te dit merci (enfin, un peu). Qui suis-je ?",
    "reponseReference": "LES SAMEDIS TRAVAILLÉS",
    "id": 30
  },
  {
    "manche": 5,
    "type": "Libre",
    "question": "Je suis un outil magique qui te raconte tout : délais, stocks, et même combien tu bosses bien. Je suis un miroir numérique un peu capricieux, parfois prêt à charger, patience, jeune padawan ! Je t'aide aussi à savoir si les clients sont contenus, grâce aux enquêtes, ça rigole pas. Et je surveille les affiliations des salariés, pour que personne ne traîne dans l'ombre. Qui suis-je ?",
    "reponseReference": "POWER BI",
    "id": 31
  },
  {
    "id": 32,
    "type": "Libre",
    "question": "Je suis ce temps mystérieux entre « demande envoyée » et « problème réglé », souvent trop long pour les impatients. Parfois je file à toute vitesse, parfois je prends mon temps… c'est le grand huit des dossiers ! On m'observe comme un compte à rebours, espérant que je ne dépasse pas la limite. Je cours vers Power BI﻿ pour te trouver, comme un détective en mission. Qui suis-je ?",
    "reponseReference": "DÉLAIS DE TRAITEMENT",
    "manche": 1
  },
  {
    "manche": 5,
    "type": "Libre",
    "question": "Je suis ce temps mystérieux entre « demande envoyée » et « problème réglé », souvent trop long pour les impatients. Parfois je file à toute vitesse, parfois je prends mon temps… c'est le grand huit des dossiers ! On m'observe comme un compte à rebours, espérant que je ne dépasse pas la limite. Je cours vers Power BI﻿ pour te trouver, comme un détective en mission. Qui suis-je ?",
    "reponseReference": "DÉLAIS DE TRAITEMENT",
    "id": 33
  }
];

module.exports = questions;
module.exports.MANCHES = MANCHES;
