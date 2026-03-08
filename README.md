# Button Men PWA

A Progressive Web App implementation of the Button Men dice game.

## Features

- ✅ Character selection from the Soldiers set (12 characters)
- ✅ X Swing dice support
- ✅ Power and Skill attacks
- ✅ Best of 5 rounds (first to 3 wins)
- ✅ Modern, clean UI with reactive state updates
- ✅ PWA support for offline play and installation

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:5173/ in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deploy to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Setup Steps:

1. **Create a GitHub repository** named `buttonm`

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to Pages section (Settings → Pages)
   - Under "Source", select "GitHub Actions"

3. **Push your code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/buttonm.git
   git push -u origin main
   ```

4. **Automatic deployment**: The GitHub Action will automatically build and deploy your site to:
   ```
   https://YOUR-USERNAME.github.io/buttonm/
   ```

### Local Configuration

The app is configured with `base: '/buttonm/'` in `vite.config.js` for GitHub Pages deployment. If you want to deploy to a different path or use a custom domain, update this value.

## How to Play

1. **Character Selection**: Both players choose a character from the Soldiers set
2. **Swing Dice Setup**: Choose sizes for X swing dice (4-20 sides)
3. **Gameplay**:
   - Dice are rolled automatically
   - The player with the lowest die goes first
   - On your turn, select your dice to attack with, then select an opponent die to capture
   - **Power Attack**: Use one die with value ≥ target die value
   - **Skill Attack**: Use multiple dice that sum exactly to target die value
   - After attacking, your attacking dice are re-rolled
   - If you can't attack, you must pass
   - Round ends when both players pass
4. **Scoring**:
   - Captured dice: full points (die size)
   - Remaining dice: half points (rounded down)
5. **Winning**: First player to win 3 rounds wins the match

## Project Structure

```
src/
├── components/     # React components
├── game/          # Game logic
├── data/          # Character data
└── styles/        # CSS styles
```

## Technologies

- React 18
- Vite
- PWA (with vite-plugin-pwa)

## Future Enhancements

- More dice types (Poison, Shadow, Berserk, etc.)
- AI opponent
- Online multiplayer
- Additional character sets
- Statistics and match history
