.PHONY: build run clean install

# Установка зависимостей
install:
	@echo "Проверяем наличие TypeScript..."
	@which tsc > /dev/null || (echo "TypeScript не найден. Установите его: npm install -g typescript" && exit 1)
	@echo "TypeScript найден!"

# Сборка проекта
build: install
	@echo "Компилируем TypeScript..."
	@mkdir -p dist
	tsc
	@echo "Сборка завершена!"

# Запуск игры
run: build
	@echo "Запускаем игру..."
	python3 server.py

# Очистка
clean:
	@echo "Очищаем dist..."
	rm -rf dist
	@echo "Очистка завершена!"

# Быстрый запуск без пересборки
serve:
	python3 server.py
