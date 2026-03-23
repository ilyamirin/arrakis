import { Game } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    
    const game = new Game(canvas);
    
    restartBtn.addEventListener('click', () => {
        game.restart();
    });
});
