# Firewise Equipment Care

Je n'ai aucune connaissance en programmation. Crée-moi une application web complète, responsive (mobile et ordinateur), pour la gestion de matériel SSI (Système de Sécurité Incendie).
L'application doit inclure :
1. Une base de données hiérarchique : Sites -> Bâtiments -> Matériel SSI (type d'équipement, marque, modèle, numéro de série, localisation, date de mise en service, état).
2. Un module de création de rapports avec choix du type : Maintenance, Dépannage, Mise en service, ou Rapport journalier.
3. La possibilité de lier le rapport à un site/bâtiment/matériel de la base de données, OU de saisir les informations manuellement sans passer par la base.
4. Des champs pour les observations, les anomalies, les pièces remplacées et la signature du technicien/client.
5. Un bouton pour exporter chaque rapport au format PDF et un bouton pour l'exporter au format Word (.docx).
Donne-moi la solution la plus simple à mettre en place gratuitement sans installer de serveur complexe."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://firewise-equipment-care.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7848c88b-8018-40dc-8d58-7e91febe481b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
