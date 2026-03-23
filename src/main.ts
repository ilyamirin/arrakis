import { Game } from './game.js';

console.log('Main.ts загружен');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен');
    
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    
    if (!canvas) {
        console.error('Canvas не найден!');
        return;
    }
    
    if (!restartBtn) {
        console.error('Кнопка перезапуска не найдена!');
        return;
    }
    
    console.log('Создаем игру...');
    const game = new Game(canvas);
    console.log('Игра создана');
    
    restartBtn.addEventListener('click', () => {
        console.log('Перезапуск игры');
        game.restart();
    });
});
