# TOPOLIS FeedMill

Application pilote de prediagnostic des usines d'aliments pour animaux.

## Lancer l'application

Ouvrir simplement `index.html` dans un navigateur.

Aucune installation n'est necessaire pour cette V1 : l'application utilise seulement
HTML, CSS et JavaScript.

## Perimetre V1

- Formulaire mensuel par usine et par mois cloture.
- Donnees de production, matieres, achats, energie, main-d'oeuvre, debit,
  ventes, marge et performance client.
- Calcul automatique des indicateurs principaux :
  - cout matiere en MAD HT/t ;
  - prix d'achat rendu usine ;
  - kWh/t ;
  - cout energie/t ;
  - main-d'oeuvre directe/t ;
  - debit reel t/h ;
  - prix de vente net moyen ;
  - ecart sur matiere ;
  - cout industriel partiel ;
  - indice de consommation client.
- Alertes de coherence sur les donnees atypiques.
- Couverture des donnees sur 6 indicateurs cles.
- Priorites d'audit pilote.

## Suite recommandee

1. Ajouter l'enregistrement local des fiches.
2. Ajouter une vraie base de donnees multi-usines.
3. Ajouter les profils utilisateur : usine, consultant TOPOLIS, administrateur.
4. Ajouter la comparaison historique et inter-usines avec donnees documentees.
5. Exporter la fiche en PDF ou Excel pour l'audit.
